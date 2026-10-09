export interface ChipValidado {
  rotulo: string;
  valor: string;
  tom: 'ok' | 'alerta' | 'critico' | 'neutro';
  icone: string;
}

export type NivelPrioridade = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';

/**
 * Prioridade derivada de sentimento, urgencia, reincidencia e espera.
 * `motivos` existe para que a fila nunca comunique urgencia so por cor:
 * o operador le em texto por que aquele card subiu.
 */
export interface Prioridade {
  nivel: NivelPrioridade;
  pontuacao: number;
  motivos: string[];
}

export interface ItemHistorico {
  protocolo: string;
  assunto: string;
  data: string;
  origem: string;
  status: string;
  ativo: boolean;
}

/** Card entregue ao OmniDashboard no transbordo. Nunca contem CPF completo. */
export interface HandoffCard {
  id: number;
  protocolo: string;
  sessionId: string;
  canal: string;
  status: 'NA_FILA' | 'EM_ATENDIMENTO' | 'ENCERRADO';
  operador: string | null;
  entrouNaFilaEm: string;
  tempoEsperaSegundos: number;
  motivo: string;
  prioridade: Prioridade;
  /** Texto normalizado (cliente, resumo, intencoes, conversa) usado na busca. */
  indiceBusca: string;

  ia: {
    resumo: string;
    sentimento: string;
    urgencia: string;
    intencoes: { nome: string; confianca: number }[];
    proximoPasso: string;
    fonte: string;
    atualizadoEm: string;
  };

  cliente: {
    id: number;
    nome: string;
    /** Mascarado na origem por politica de LGPD. O CPF integral nao trafega. */
    cpfMascarado: string;
    telefone: string;
    telefoneFormatado: string;
    planoAtivo: string;
    endereco: string;
    clienteDesde: string;
    ultimaOs: string;
    tipoContrato: string;
    statusConta: string;
    /** Cliente com historico de chamados: pesa na prioridade. */
    reincidente: boolean;
    totalProtocolos: number;
  };

  chips: ChipValidado[];
  historicoRecente: ItemHistorico[];
  conversa: { remetente: string; texto: string; timestamp: string }[];
}
