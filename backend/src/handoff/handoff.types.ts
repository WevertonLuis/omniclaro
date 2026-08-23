export interface ChipValidado {
  rotulo: string;
  valor: string;
  tom: 'ok' | 'alerta' | 'critico' | 'neutro';
  icone: string;
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
  };

  chips: ChipValidado[];
  historicoRecente: ItemHistorico[];
  conversa: { remetente: string; texto: string; timestamp: string }[];
}
