import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { maskCpf } from '../common/mask.util';
import {
  AtendimentoHumano,
  Cliente,
  IntencaoExtraida,
  Mensagem,
  Operador,
  Protocolo,
  Sessao,
} from '../database/entities';

export interface Kpi {
  rotulo: string;
  valor: string;
  detalhe: string;
  /** Meta declarada na secao 9.1 da documentacao, quando existir. */
  meta?: string;
  atingiuMeta?: boolean;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Sessao) private readonly sessoes: Repository<Sessao>,
    @InjectRepository(Mensagem) private readonly mensagens: Repository<Mensagem>,
    @InjectRepository(IntencaoExtraida) private readonly intencoes: Repository<IntencaoExtraida>,
    @InjectRepository(Protocolo) private readonly protocolos: Repository<Protocolo>,
    @InjectRepository(AtendimentoHumano) private readonly atendimentos: Repository<AtendimentoHumano>,
    @InjectRepository(Operador) private readonly operadores: Repository<Operador>,
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
  ) {}

  async metricas() {
    const [sessoes, mensagens, intencoes, protocolos, atendimentos] = await Promise.all([
      this.sessoes.find(),
      this.mensagens.find(),
      this.intencoes.find(),
      this.protocolos.find(),
      this.atendimentos.find(),
    ]);

    const totalSessoes = sessoes.length;
    const transbordadas = sessoes.filter((s) => s.status_sessao === 'HANDOFF').length;

    // FCR: sessoes resolvidas sem passar por atendente humano (meta >= 70%).
    const fcr = totalSessoes ? ((totalSessoes - transbordadas) / totalSessoes) * 100 : 0;

    const esperas = atendimentos.map((a) => a.tempo_espera_segundos).filter((n) => n > 0);
    const esperaMedia = esperas.length ? esperas.reduce((a, b) => a + b, 0) / esperas.length : 0;

    const csats = atendimentos.map((a) => a.avaliacao_csat).filter((n): n is number => typeof n === 'number');
    const csatMedio = csats.length ? csats.reduce((a, b) => a + b, 0) / csats.length : null;

    const confiancas = intencoes.map((i) => i.score_confianca);
    const confiancaMedia = confiancas.length ? confiancas.reduce((a, b) => a + b, 0) / confiancas.length : 0;

    // Multiplas intencoes por mensagem: a tese central do projeto, medida.
    const porMensagem = new Map<string, number>();
    for (const i of intencoes) porMensagem.set(i.id_mensagem, (porMensagem.get(i.id_mensagem) ?? 0) + 1);
    const mensagensComVarias = [...porMensagem.values()].filter((n) => n > 1).length;
    const taxaMultiIntencao = porMensagem.size ? (mensagensComVarias / porMensagem.size) * 100 : 0;

    const kpis: Kpi[] = [
      {
        rotulo: 'Sessões',
        valor: String(totalSessoes),
        detalhe: `${sessoes.filter((s) => s.status_sessao === 'ATIVA').length} ativas`,
      },
      {
        rotulo: 'Resolução sem humano (FCR)',
        valor: `${fcr.toFixed(0)}%`,
        detalhe: `${transbordadas} transbordo(s) de ${totalSessoes}`,
        meta: '≥ 70%',
        atingiuMeta: fcr >= 70,
      },
      {
        rotulo: 'Confiança média da IA',
        valor: `${(confiancaMedia * 100).toFixed(0)}%`,
        detalhe: `${intencoes.length} intenções classificadas`,
        meta: '≥ 80% (limiar)',
        atingiuMeta: confiancaMedia >= 0.8,
      },
      {
        rotulo: 'Mensagens com múltiplas intenções',
        valor: `${taxaMultiIntencao.toFixed(0)}%`,
        detalhe: `${mensagensComVarias} de ${porMensagem.size} mensagens`,
      },
      {
        rotulo: 'Espera média no transbordo',
        valor: esperaMedia ? `${esperaMedia.toFixed(0)}s` : '—',
        detalhe: `${atendimentos.length} atendimento(s) humano(s)`,
      },
      {
        rotulo: 'CSAT médio',
        valor: csatMedio ? csatMedio.toFixed(1) : '—',
        detalhe: csats.length ? `${csats.length} avaliação(ões)` : 'sem avaliações ainda',
      },
    ];

    return {
      kpis,
      volumetria: {
        sessoes: totalSessoes,
        mensagens: mensagens.length,
        mensagensCliente: mensagens.filter((m) => m.remetente === 'CLIENTE').length,
        mensagensBot: mensagens.filter((m) => m.remetente === 'BOT').length,
        mensagensAtendente: mensagens.filter((m) => m.remetente === 'ATENDENTE').length,
        protocolos: protocolos.length,
        clientes: await this.clientes.count(),
      },
      intencoesFrequentes: this.agrupar(intencoes.map((i) => i.nome_intencao)),
      statusProtocolos: this.agrupar(protocolos.map((p) => p.status)),
      canais: this.agrupar(sessoes.map((s) => s.canal_origem)),
      geradoEm: new Date().toISOString(),
    };
  }

  async listarSessoes() {
    const [sessoes, mensagens, clientes] = await Promise.all([
      this.sessoes.find({ order: { data_inicio: 'DESC' }, take: 50 }),
      this.mensagens.find(),
      this.clientes.find(),
    ]);

    return sessoes.map((s) => {
      const cliente = clientes.find((c) => c.id === s.id_cliente);
      const daSessao = mensagens.filter((m) => m.id_sessao === s.id);
      return {
        id: s.id,
        canal: s.canal_origem,
        status: s.status_sessao,
        iniciadaEm: new Date(s.data_inicio).toISOString(),
        totalMensagens: daSessao.length,
        cliente: cliente
          ? { nome: cliente.nome, cpfMascarado: maskCpf(cliente.cpf_cnpj), plano: cliente.plano_ativo }
          : null,
      };
    });
  }

  async listarOperadores() {
    const [operadores, atendimentos] = await Promise.all([
      this.operadores.find({ order: { id: 'ASC' } }),
      this.atendimentos.find(),
    ]);

    return operadores.map((o) => {
      const meus = atendimentos.filter((a) => a.id_operador === o.nome);
      const esperas = meus.map((a) => a.tempo_espera_segundos).filter((n) => n > 0);
      return {
        id: o.id,
        nome: o.nome,
        email: o.email,
        papel: o.papel,
        turno: o.turno ?? '—',
        ativo: o.ativo,
        atendimentos: meus.length,
        emAndamento: meus.filter((a) => a.status === 'EM_ATENDIMENTO').length,
        esperaMediaSegundos: esperas.length ? Math.round(esperas.reduce((a, b) => a + b, 0) / esperas.length) : 0,
      };
    });
  }

  private agrupar(valores: string[]) {
    const contagem = new Map<string, number>();
    for (const v of valores) contagem.set(v, (contagem.get(v) ?? 0) + 1);
    const total = valores.length || 1;
    return [...contagem.entries()]
      .map(([nome, quantidade]) => ({ nome, quantidade, percentual: (quantidade / total) * 100 }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }
}
