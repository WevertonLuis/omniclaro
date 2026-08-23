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

export interface TurnoConversa {
  remetente: 'CLIENTE' | 'BOT' | 'ATENDENTE';
  texto: string;
  timestamp: string;
  quickReplies?: string[];
  operador?: string;
}

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
  conversa: TurnoConversa[];
}
