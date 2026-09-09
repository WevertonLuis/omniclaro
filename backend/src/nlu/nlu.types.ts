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

/** Dominios de negocio da documentacao tecnica, secao 3.2. */
export const DOMINIOS = ['SUPPORT', 'SALES', 'BILLING', 'GENERAL'] as const;
export type Dominio = (typeof DOMINIOS)[number];

/** Acao que o orquestrador deve despachar para cada intencao. */
export const ACOES = [
  'DIAGNOSE_NETWORK',
  'FETCH_OFFERS',
  'ACTIVATE_OFFER',
  'FETCH_INVOICE',
  'ESCALATE_HUMAN',
  'NONE',
] as const;
export type Acao = (typeof ACOES)[number];

/**
 * Dominio e acao sao derivados da intencao em codigo, nao pedidos ao modelo.
 * A relacao e fixa e conhecida — deixar o Gemini adivinhar so abriria espaco
 * para alucinacao num campo que decide o despacho.
 */
export const CATALOGO_INTENCOES: Record<NomeIntencao, { domain: Dominio; requiresAction: Acao }> = {
  SUPORTE_TECNICO_INSTABILIDADE: { domain: 'SUPPORT', requiresAction: 'DIAGNOSE_NETWORK' },
  SUPORTE_TECNICO_SEM_CONEXAO: { domain: 'SUPPORT', requiresAction: 'DIAGNOSE_NETWORK' },
  SUPORTE_TECNICO_LENTIDAO: { domain: 'SUPPORT', requiresAction: 'DIAGNOSE_NETWORK' },
  CONTRATACAO_SERVICO_STREAMING: { domain: 'SALES', requiresAction: 'FETCH_OFFERS' },
  CONSULTA_OFERTAS: { domain: 'SALES', requiresAction: 'FETCH_OFFERS' },
  CONFIRMACAO_CONTRATACAO: { domain: 'SALES', requiresAction: 'ACTIVATE_OFFER' },
  CONSULTA_FATURA: { domain: 'BILLING', requiresAction: 'FETCH_INVOICE' },
  SEGUNDA_VIA_FATURA: { domain: 'BILLING', requiresAction: 'FETCH_INVOICE' },
  FALAR_COM_ATENDENTE: { domain: 'GENERAL', requiresAction: 'ESCALATE_HUMAN' },
  CANCELAMENTO: { domain: 'GENERAL', requiresAction: 'ESCALATE_HUMAN' },
  SAUDACAO: { domain: 'GENERAL', requiresAction: 'NONE' },
  OUTROS: { domain: 'GENERAL', requiresAction: 'NONE' },
};

export interface IntencaoDetectada {
  nome: NomeIntencao;
  confianca: number;
  entidades?: Record<string, string>;
  /** Preenchidos pelo CATALOGO_INTENCOES apos a inferencia. */
  domain?: Dominio;
  requiresAction?: Acao;
}

export function enriquecerIntencao(i: IntencaoDetectada): IntencaoDetectada {
  const meta = CATALOGO_INTENCOES[i.nome] ?? CATALOGO_INTENCOES.OUTROS;
  return { ...i, domain: meta.domain, requiresAction: meta.requiresAction };
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
