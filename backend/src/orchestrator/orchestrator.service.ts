import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { ConversationService } from '../conversation/conversation.service';
import { CanalOrigem } from '../database/entities';
import { HandoffService } from '../handoff/handoff.service';
import { HandoffCard } from '../handoff/handoff.types';
import { DiagnosticoRede, MocksService, Oferta } from '../mocks/mocks.service';
import { NluService } from '../nlu/nlu.service';
import { NomeIntencao, ResultadoNlu } from '../nlu/nlu.types';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SessionService } from '../session/session.service';
import { ContextoSessao } from '../session/session.types';
import { comporMensagemTransbordo, comporResposta } from './reply.composer';

export interface MensagemEntrada {
  texto: string;
  canal?: CanalOrigem;
  telefone?: string;
  cpf?: string;
  clienteId?: number;
}

export interface RespostaOrquestrador {
  sessionId: string;
  protocolo: string | null;
  modo: 'AUTOMATICO' | 'TRANSBORDO' | 'ATENDIMENTO_HUMANO';
  resposta: string | null;
  quickReplies: string[];
  nlu: ResultadoNlu | null;
  acoes: {
    diagnostico: DiagnosticoRede | null;
    oferta: Oferta | null;
  };
  handoff: HandoffCard | null;
  telemetria: {
    latencia_total_ms: number;
    latencia_nlu_ms: number;
    cache_driver: string;
  };
}

const INTENCOES_SUPORTE: NomeIntencao[] = [
  'SUPORTE_TECNICO_INSTABILIDADE',
  'SUPORTE_TECNICO_SEM_CONEXAO',
  'SUPORTE_TECNICO_LENTIDAO',
];

const INTENCOES_COMERCIAIS: NomeIntencao[] = ['CONTRATACAO_SERVICO_STREAMING', 'CONSULTA_OFERTAS'];

const INTENCOES_ESCALADA: NomeIntencao[] = ['FALAR_COM_ATENDENTE', 'CANCELAMENTO'];

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly limiarConfianca: number;

  constructor(
    private readonly conversation: ConversationService,
    private readonly sessions: SessionService,
    private readonly nlu: NluService,
    private readonly mocks: MocksService,
    private readonly handoff: HandoffService,
    private readonly gateway: RealtimeGateway,
    config: ConfigService,
  ) {
    this.limiarConfianca = config.get<number>('handoffConfidenceThreshold') ?? 0.8;
  }

  async processar(entrada: MensagemEntrada): Promise<RespostaOrquestrador> {
    const inicio = Date.now();
    const canal: CanalOrigem = entrada.canal ?? 'WHATSAPP';

    // 1. Identificacao do cliente
    const cliente = await this.conversation.resolverCliente(entrada);
    const primeiroNome = cliente.nome.split(' ')[0];

    // 2. Recupera ou cria a sessao no cache (session:customer:{id}, TTL 24h)
    let contexto = await this.sessions.obterPorCliente(cliente.id);
    if (!contexto || contexto.status === 'ENCERRADA') {
      const sessao = await this.conversation.criarSessao(cliente.id, canal);
      contexto = await this.sessions.criar(cliente.id, sessao.id, canal);
    }
    const primeiroTurno = contexto.turnos === 0;

    // 3. Persiste a mensagem do cliente e espelha no dashboard
    const mensagem = await this.conversation.registrarMensagem(contexto.sessionId, 'CLIENTE', entrada.texto);
    contexto = await this.sessions.registrarTurno(contexto, {
      remetente: 'CLIENTE',
      texto: entrada.texto,
      timestamp: new Date().toISOString(),
    });
    this.gateway.emitirMensagem(contexto.sessionId, 'CLIENTE', entrada.texto);

    // 4. Sessao ja em atendimento humano: o bot sai do caminho
    if (contexto.status === 'HANDOFF') {
      return this.montarResposta(contexto, null, null, null, null, 'ATENDIMENTO_HUMANO', null, [], inicio);
    }

    // 5. NLU: extracao de multiplas intencoes com schema JSON forcado
    const nlu = await this.nlu.processarIntencao(entrada.texto, {
      nomeCliente: cliente.nome,
      planoCliente: cliente.plano_ativo,
      historico: contexto.historico.slice(-6).map((h) => ({ remetente: h.remetente, texto: h.texto })),
    });
    await this.conversation.registrarIntencoes(mensagem.id, nlu.intencoes);

    contexto.ultimoResumo = nlu.resumo;
    contexto.ultimoSentimento = nlu.sentimento;
    contexto.ultimaUrgencia = nlu.urgencia;
    contexto.intencoesAcumuladas = [
      ...new Set([...contexto.intencoesAcumuladas, ...nlu.intencoes.map((i) => i.nome)]),
    ];
    contexto.ultimasIntencoes = nlu.intencoes.map((i) => ({ nome: i.nome, confianca: i.confianca }));
    contexto.ultimaFonte = nlu.fonte;

    const nomes = nlu.intencoes.map((i) => i.nome);
    const maiorConfianca = nlu.intencoes[0]?.confianca ?? 0;

    this.logger.log(
      `[${contexto.sessionId.slice(0, 8)}] intencoes=[${nomes.join(', ')}] confianca=${maiorConfianca.toFixed(2)} ` +
        `sentimento=${nlu.sentimento} fonte=${nlu.fonte} (${nlu.latencia_ms}ms)`,
    );

    // 6. Regra de transbordo: pedido explicito, sinal do modelo ou confianca abaixo do limiar
    const pedidoExplicito = nomes.some((n) => INTENCOES_ESCALADA.includes(n));
    const baixaConfianca = maiorConfianca < this.limiarConfianca;
    if (pedidoExplicito || nlu.requer_humano || baixaConfianca) {
      const motivo = pedidoExplicito
        ? 'Cliente solicitou atendimento humano'
        : nlu.requer_humano
          ? 'Modelo sinalizou necessidade de atendimento humano'
          : `Confianca ${maiorConfianca.toFixed(2)} abaixo do limiar ${this.limiarConfianca}`;

      return this.executarTransbordo(contexto, nlu, motivo, primeiroNome, inicio);
    }

    // 7. Acoes despachadas EM PARALELO conforme as intencoes detectadas
    const precisaSuporte = nomes.some((n) => INTENCOES_SUPORTE.includes(n));
    const precisaOferta = nomes.some((n) => INTENCOES_COMERCIAIS.includes(n));
    const confirmando = nomes.includes('CONFIRMACAO_CONTRATACAO') && Boolean(contexto.ofertaPendente);

    const servico = nlu.intencoes.find((i) => INTENCOES_COMERCIAIS.includes(i.nome))?.entidades?.servico;
    const equipamento =
      nlu.intencoes.find((i) => INTENCOES_SUPORTE.includes(i.nome))?.entidades?.equipamento ?? 'modem';

    const [diagnostico, oferta] = await Promise.all([
      precisaSuporte ? this.mocks.resetSignal(equipamento) : Promise.resolve(null),
      precisaOferta ? this.mocks.melhorOferta(servico) : Promise.resolve(null),
    ]);

    if (diagnostico) contexto.diagnostico = diagnostico;
    if (oferta) contexto.ofertaPendente = oferta;
    if (confirmando) contexto.ofertaConfirmada = true;

    // 8. Protocolo aberto na primeira acao tecnica da sessao
    if (precisaSuporte && !contexto.protocolo) {
      const protocolo = await this.conversation.abrirProtocolo(
        cliente.id,
        contexto.sessionId,
        'Falha de conexao - diagnostico remoto',
        this.rotuloCanal(canal),
      );
      contexto.protocolo = protocolo.numero_protocolo;
    }

    // 9. Resposta unificada e humanizada
    const composta = comporResposta({
      primeiroNome,
      nlu,
      diagnostico: contexto.diagnostico,
      oferta: confirmando ? contexto.ofertaPendente : oferta,
      ofertaConfirmada: confirmando,
      protocolo: contexto.protocolo,
      primeiroTurno,
    });

    await this.conversation.registrarMensagem(contexto.sessionId, 'BOT', composta.texto);
    contexto = await this.sessions.registrarTurno(contexto, {
      remetente: 'BOT',
      texto: composta.texto,
      timestamp: new Date().toISOString(),
    });

    this.gateway.emitirMensagem(contexto.sessionId, 'BOT', composta.texto, { quickReplies: composta.quickReplies });
    this.gateway.emitirContexto(contexto.sessionId, contexto);

    return this.montarResposta(
      contexto,
      nlu,
      diagnostico,
      confirmando ? contexto.ofertaPendente : oferta,
      null,
      'AUTOMATICO',
      composta.texto,
      composta.quickReplies,
      inicio,
    );
  }

  // ------------------------------ Transbordo ------------------------------

  private async executarTransbordo(
    contexto: ContextoSessao,
    nlu: ResultadoNlu,
    motivo: string,
    primeiroNome: string,
    inicio: number,
  ): Promise<RespostaOrquestrador> {
    const card = await this.handoff.enfileirar({ contexto, nlu, motivo });
    const fila = await this.handoff.listarFila();
    const posicao = fila.filter((c) => c.status === 'NA_FILA').findIndex((c) => c.protocolo === card.protocolo) + 1;

    const texto = comporMensagemTransbordo(primeiroNome, card.protocolo, posicao);
    await this.conversation.registrarMensagem(contexto.sessionId, 'BOT', texto);
    const atualizado = await this.sessions.registrarTurno(contexto, {
      remetente: 'BOT',
      texto,
      timestamp: new Date().toISOString(),
    });

    this.gateway.emitirMensagem(contexto.sessionId, 'BOT', texto, { transbordo: true });

    return this.montarResposta(
      atualizado,
      nlu,
      atualizado.diagnostico,
      atualizado.ofertaPendente,
      card,
      'TRANSBORDO',
      texto,
      [],
      inicio,
    );
  }

  // ------------------------------ Auxiliares ------------------------------

  private montarResposta(
    contexto: ContextoSessao,
    nlu: ResultadoNlu | null,
    diagnostico: DiagnosticoRede | null,
    oferta: Oferta | null,
    handoff: HandoffCard | null,
    modo: RespostaOrquestrador['modo'],
    resposta: string | null,
    quickReplies: string[],
    inicio: number,
  ): RespostaOrquestrador {
    return {
      sessionId: contexto.sessionId,
      protocolo: contexto.protocolo,
      modo,
      resposta,
      quickReplies,
      nlu,
      acoes: { diagnostico, oferta },
      handoff,
      telemetria: {
        latencia_total_ms: Date.now() - inicio,
        latencia_nlu_ms: nlu?.latencia_ms ?? 0,
        cache_driver: this.sessions.driver(),
      },
    };
  }

  private rotuloCanal(canal: CanalOrigem): string {
    if (canal === 'WHATSAPP') return 'Chat';
    if (canal === 'APP_MINHA_CLARO') return 'App';
    return 'Web';
  }
}
