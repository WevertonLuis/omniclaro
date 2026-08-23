import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatTelefone, maskCpf } from '../common/mask.util';
import { ConversationService } from '../conversation/conversation.service';
import { AtendimentoHumano } from '../database/entities';
import { ResultadoNlu } from '../nlu/nlu.types';
import { SessionService } from '../session/session.service';
import { ContextoSessao } from '../session/session.types';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ChipValidado, HandoffCard, ItemHistorico } from './handoff.types';

const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

function dataCurta(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

@Injectable()
export class HandoffService {
  private readonly logger = new Logger(HandoffService.name);

  constructor(
    @InjectRepository(AtendimentoHumano) private readonly atendimentos: Repository<AtendimentoHumano>,
    private readonly conversation: ConversationService,
    private readonly sessions: SessionService,
    @Inject(forwardRef(() => RealtimeGateway)) private readonly gateway: RealtimeGateway,
  ) {}

  /**
   * Enfileira o transbordo: grava o resumo cognitivo, congela o contexto
   * e empurra o card para o OmniDashboard via WebSocket.
   */
  async enfileirar(params: { contexto: ContextoSessao; nlu?: ResultadoNlu; motivo: string }): Promise<HandoffCard> {
    const { contexto, nlu, motivo } = params;

    const protocolo =
      contexto.protocolo ??
      (
        await this.conversation.abrirProtocolo(
          contexto.clienteId,
          contexto.sessionId,
          'Transbordo para atendimento humano',
        )
      ).numero_protocolo;

    contexto.protocolo = protocolo;
    contexto.status = 'HANDOFF';
    await this.sessions.salvar(contexto);
    await this.conversation.atualizarStatusSessao(contexto.sessionId, 'HANDOFF');
    await this.conversation.atualizarStatusProtocolo(protocolo, 'ESCALADO');

    const resumo = nlu?.resumo ?? contexto.ultimoResumo ?? 'Sem resumo cognitivo disponivel.';

    const registro = await this.atendimentos.save(
      this.atendimentos.create({
        numero_protocolo: protocolo,
        id_operador: null,
        resumo_cognitivo_ia: resumo,
        tempo_espera_segundos: 0,
        status: 'NA_FILA',
        id_sessao: contexto.sessionId,
      }),
    );

    const card = await this.montarCard(registro, contexto, nlu, motivo);
    this.gateway.emitirHandoff(card);
    this.logger.log(`Transbordo enfileirado: protocolo ${protocolo} (motivo: ${motivo})`);
    return card;
  }

  async listarFila(): Promise<HandoffCard[]> {
    const registros = await this.atendimentos.find({
      where: [{ status: 'NA_FILA' }, { status: 'EM_ATENDIMENTO' }],
      order: { data_entrada_fila: 'ASC' },
    });

    const cards: HandoffCard[] = [];
    for (const registro of registros) {
      const contexto = await this.sessions.obterPorSessao(registro.id_sessao);
      if (!contexto) continue;
      cards.push(await this.montarCard(registro, contexto));
    }
    return cards;
  }

  async assumir(protocolo: string, operador: string): Promise<HandoffCard> {
    const registro = await this.atendimentos.findOne({ where: { numero_protocolo: protocolo } });
    if (!registro) throw new NotFoundException(`Atendimento do protocolo ${protocolo} nao encontrado.`);

    const espera = Math.max(0, Math.round((Date.now() - new Date(registro.data_entrada_fila).getTime()) / 1000));
    registro.id_operador = operador;
    registro.status = 'EM_ATENDIMENTO';
    registro.tempo_espera_segundos = espera;
    await this.atendimentos.save(registro);

    const contexto = await this.sessions.obterPorSessao(registro.id_sessao);
    this.logger.log(`${operador} assumiu o protocolo ${protocolo} apos ${espera}s de espera`);
    return this.montarCard(registro, contexto);
  }

  async encerrar(sessionId: string, protocolo?: string): Promise<void> {
    const registro = protocolo
      ? await this.atendimentos.findOne({ where: { numero_protocolo: protocolo } })
      : await this.atendimentos.findOne({ where: { id_sessao: sessionId } });

    if (registro) {
      registro.status = 'ENCERRADO';
      await this.atendimentos.save(registro);
      await this.conversation.atualizarStatusProtocolo(registro.numero_protocolo, 'RESOLVIDO');
    }
    await this.conversation.atualizarStatusSessao(sessionId, 'ENCERRADA');
    const contexto = await this.sessions.obterPorSessao(sessionId);
    if (contexto) {
      contexto.status = 'ENCERRADA';
      await this.sessions.salvar(contexto);
    }
  }

  // -------------------------- Montagem do card --------------------------

  private async montarCard(
    registro: AtendimentoHumano,
    contexto: ContextoSessao,
    nlu?: ResultadoNlu,
    motivo = 'Solicitacao de atendimento humano',
  ): Promise<HandoffCard> {
    const cliente = await this.conversation.buscarCliente(contexto.clienteId);
    const protocolos = await this.conversation.historicoProtocolos(contexto.clienteId, 4);
    const mensagens = await this.conversation.historico(contexto.sessionId);

    const historicoRecente: ItemHistorico[] = [
      {
        protocolo: registro.numero_protocolo,
        assunto: this.assuntoAtual(contexto),
        data: dataCurta(new Date(registro.data_entrada_fila)),
        origem: this.rotuloCanal(contexto.canal),
        status: 'EM_ATENDIMENTO',
        ativo: true,
      },
      ...protocolos
        .filter((p) => p.numero_protocolo !== registro.numero_protocolo)
        .map((p) => ({
          protocolo: p.numero_protocolo,
          assunto: p.assunto ?? 'Atendimento',
          data: dataCurta(new Date(p.data_abertura)),
          origem: p.origem ?? 'Chat',
          status: p.status,
          ativo: false,
        })),
    ];

    // Sem NLU no argumento (ex.: recarga da fila), reaproveita os scores reais
    // guardados na sessao em vez de fabricar 100% de confianca.
    const intencoesCard = nlu?.intencoes
      ? nlu.intencoes.map((i) => ({ nome: i.nome, confianca: i.confianca }))
      : (contexto.ultimasIntencoes ?? []);

    return {
      id: registro.id,
      protocolo: registro.numero_protocolo,
      sessionId: contexto.sessionId,
      canal: contexto.canal,
      status: registro.status as HandoffCard['status'],
      operador: registro.id_operador,
      entrouNaFilaEm: new Date(registro.data_entrada_fila).toISOString(),
      tempoEsperaSegundos:
        registro.status === 'NA_FILA'
          ? Math.max(0, Math.round((Date.now() - new Date(registro.data_entrada_fila).getTime()) / 1000))
          : registro.tempo_espera_segundos,
      motivo,

      ia: {
        resumo: nlu?.resumo ?? registro.resumo_cognitivo_ia,
        sentimento: nlu?.sentimento ?? contexto.ultimoSentimento ?? 'NEUTRO',
        urgencia: nlu?.urgencia ?? contexto.ultimaUrgencia ?? 'MEDIA',
        intencoes: intencoesCard,
        proximoPasso: this.proximoPasso(contexto),
        fonte: nlu?.fonte ?? contexto.ultimaFonte ?? 'CONTEXTO_SESSAO',
        atualizadoEm: contexto.atualizadaEm,
      },

      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        // Mascaramento aplicado na origem: o CPF integral nao sai do orquestrador.
        cpfMascarado: maskCpf(cliente.cpf_cnpj),
        telefone: cliente.telefone,
        telefoneFormatado: formatTelefone(cliente.telefone),
        planoAtivo: cliente.plano_ativo ?? 'Nao informado',
        endereco: cliente.endereco ?? 'Nao informado',
        clienteDesde: cliente.cliente_desde ?? '-',
        ultimaOs: cliente.ultima_os ?? '-',
        tipoContrato: cliente.tipo_contrato,
        statusConta: cliente.status_conta,
      },

      chips: this.montarChips(contexto, cliente.status_conta, cliente.plano_ativo, registro.numero_protocolo),
      historicoRecente,
      conversa: mensagens.map((m) => ({
        remetente: m.remetente,
        texto: m.conteudo_texto,
        timestamp: new Date(m.timestamp).toISOString(),
      })),
    };
  }

  private montarChips(ctx: ContextoSessao, statusConta: string, plano: string, protocolo: string): ChipValidado[] {
    const chips: ChipValidado[] = [
      { rotulo: 'CPF', valor: 'Validado', tom: 'ok', icone: 'check' },
      { rotulo: 'Protocolo', valor: protocolo, tom: 'neutro', icone: 'hash' },
    ];

    const temSuporte = ctx.intencoesAcumuladas.some((i) => i.startsWith('SUPORTE_TECNICO'));

    if (ctx.diagnostico) {
      const online = ctx.diagnostico.status_final === 'ONLINE';
      chips.push({ rotulo: 'Modem', valor: online ? 'Online' : 'Instavel', tom: online ? 'ok' : 'critico', icone: 'alert' });
      chips.push({ rotulo: 'Reset', valor: online ? 'Concluido' : 'Em andamento', tom: online ? 'ok' : 'alerta', icone: 'warn' });
    } else if (temSuporte) {
      chips.push({ rotulo: 'Modem', valor: 'Offline', tom: 'critico', icone: 'alert' });
      chips.push({ rotulo: 'Reset', valor: 'Em andamento', tom: 'alerta', icone: 'warn' });
    }

    chips.push({
      rotulo: 'Conta',
      valor: statusConta === 'REGULAR' ? 'Regular' : 'Inadimplente',
      tom: statusConta === 'REGULAR' ? 'ok' : 'critico',
      icone: 'card',
    });

    chips.push({
      rotulo: 'Contrato',
      valor: (plano ?? 'Nao informado').replace(' - Residencial', ''),
      tom: 'neutro',
      icone: 'clock',
    });

    if (ctx.ofertaPendente) {
      chips.push({
        rotulo: 'Oferta',
        valor: ctx.ofertaConfirmada ? 'Confirmada' : 'Aguardando aceite',
        tom: ctx.ofertaConfirmada ? 'ok' : 'alerta',
        icone: 'tag',
      });
    }

    return chips;
  }

  private assuntoAtual(ctx: ContextoSessao): string {
    if (ctx.intencoesAcumuladas.some((i) => i.startsWith('SUPORTE_TECNICO'))) {
      return 'Falha de conexao - em atendimento';
    }
    if (ctx.intencoesAcumuladas.includes('CONTRATACAO_SERVICO_STREAMING')) {
      return 'Contratacao de streaming - em atendimento';
    }
    return 'Atendimento em andamento';
  }

  private proximoPasso(ctx: ContextoSessao): string {
    const temSuporte = ctx.intencoesAcumuladas.some((i) => i.startsWith('SUPORTE_TECNICO'));
    const insatisfeito = ctx.ultimoSentimento === 'FRUSTRADO' || ctx.ultimoSentimento === 'NEGATIVO';

    // Cliente irritado que escalou nao deve receber sugestao de venda: a
    // pendencia tecnica vem primeiro, o cross-sell so depois de resolvida.
    if (temSuporte && insatisfeito) {
      return ctx.diagnostico?.status_final === 'ONLINE'
        ? 'Reset remoto ja concluido e sem efeito percebido — avaliar abertura de O.S. de campo.'
        : 'Priorizar a falha de conexao: executar diagnostico remoto ou abrir O.S. de campo.';
    }
    if (ctx.ofertaPendente && !ctx.ofertaConfirmada) {
      return `Confirmar interesse em ${ctx.ofertaPendente.nome} (${ctx.ofertaPendente.preco_formatado}).`;
    }
    if (ctx.diagnostico?.status_final === 'ONLINE') {
      return 'Confirmar reconexao com o cliente ou abrir O.S. de campo.';
    }
    if (temSuporte) {
      return 'Executar diagnostico remoto ou abrir O.S. de campo.';
    }
    return 'Validar demanda com o cliente e registrar tratativa no protocolo.';
  }

  private rotuloCanal(canal: string): string {
    if (canal === 'WHATSAPP') return 'Chat';
    if (canal === 'APP_MINHA_CLARO') return 'App';
    return 'Web';
  }
}
