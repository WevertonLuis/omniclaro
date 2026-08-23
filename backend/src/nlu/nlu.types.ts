export const INTENCOES = [
  'SUPORTE_TECNICO_INSTABILIDADE',
  'SUPORTE_TECNICO_SEM_CONEXAO',
  'SUPORTE_TECNICO_LENTIDAO',
  'CONTRATACAO_SERVICO_STREAMING',
  'CONSULTA_OFERTAS',
  'CONSULTA_FATURA',
  'SEGUNDA_VIA_FATURA',
  'CONFIRMACAO_CONTRATACAO',
  'FALAR_COM_ATENDENTE',
  'CANCELAMENTO',
  'SAUDACAO',
  'OUTROS',
] as const;

export type NomeIntencao = (typeof INTENCOES)[number];

export const SENTIMENTOS = ['POSITIVO', 'NEUTRO', 'NEGATIVO', 'FRUSTRADO'] as const;
export const URGENCIAS = ['BAIXA', 'MEDIA', 'ALTA'] as const;

export interface IntencaoDetectada {
  nome: NomeIntencao;
  confianca: number;
  entidades?: Record<string, string>;
}

export interface ResultadoNlu {
  intencoes: IntencaoDetectada[];
  sentimento: (typeof SENTIMENTOS)[number];
  urgencia: (typeof URGENCIAS)[number];
  resumo: string;
  requer_humano: boolean;
  /** GEMINI | FALLBACK_HEURISTICO - rastreia a origem da inferencia. */
  fonte: 'GEMINI' | 'FALLBACK_HEURISTICO';
  latencia_ms: number;
}
