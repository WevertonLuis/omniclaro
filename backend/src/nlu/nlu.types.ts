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
export interface MetaIntencao {
  domain: Dominio;
  requiresAction: Acao;
  /** Como a intencao aparece dentro da pergunta de desambiguacao. */
  rotulo: string | null;
  /** Texto do botao de resposta rapida. Precisa reclassificar com alta confianca. */
  atalho: string | null;
}

export const CATALOGO_INTENCOES: Record<NomeIntencao, MetaIntencao> = {
  SUPORTE_TECNICO_INSTABILIDADE: {
    domain: 'SUPPORT',
    requiresAction: 'DIAGNOSE_NETWORK',
    rotulo: 'a internet de casa caindo',
    atalho: 'Minha internet esta caindo',
  },
  SUPORTE_TECNICO_SEM_CONEXAO: {
    domain: 'SUPPORT',
    requiresAction: 'DIAGNOSE_NETWORK',
    rotulo: 'a internet de casa sem conexao',
    atalho: 'Estou sem internet',
  },
  SUPORTE_TECNICO_LENTIDAO: {
    domain: 'SUPPORT',
    requiresAction: 'DIAGNOSE_NETWORK',
    rotulo: 'a internet de casa lenta',
    atalho: 'Minha internet esta lenta',
  },
  CONTRATACAO_SERVICO_STREAMING: {
    domain: 'SALES',
    requiresAction: 'FETCH_OFFERS',
    rotulo: 'contratar um pacote de streaming',
    atalho: 'Quero um pacote de streaming',
  },
  CONSULTA_OFERTAS: {
    domain: 'SALES',
    requiresAction: 'FETCH_OFFERS',
    rotulo: 'ver ofertas e planos',
    atalho: 'Ver ofertas de streaming',
  },
  CONFIRMACAO_CONTRATACAO: {
    domain: 'SALES',
    requiresAction: 'ACTIVATE_OFFER',
    rotulo: 'confirmar uma contratacao',
    atalho: 'Confirmar contratacao',
  },
  CONSULTA_FATURA: {
    domain: 'BILLING',
    requiresAction: 'FETCH_INVOICE',
    rotulo: 'a sua fatura',
    atalho: 'Ver minha fatura',
  },
  SEGUNDA_VIA_FATURA: {
    domain: 'BILLING',
    requiresAction: 'FETCH_INVOICE',
    rotulo: 'a segunda via da fatura',
    atalho: 'Segunda via da fatura',
  },
  FALAR_COM_ATENDENTE: {
    domain: 'GENERAL',
    requiresAction: 'ESCALATE_HUMAN',
    rotulo: 'falar com um atendente',
    atalho: 'Falar com atendente',
  },
  CANCELAMENTO: {
    domain: 'GENERAL',
    requiresAction: 'ESCALATE_HUMAN',
    rotulo: 'cancelamento',
    atalho: 'Quero cancelar',
  },
  // Saudacao e OUTROS nao viram opcao: nao dizem nada sobre o que o cliente quer.
  SAUDACAO: { domain: 'GENERAL', requiresAction: 'NONE', rotulo: null, atalho: null },
  OUTROS: { domain: 'GENERAL', requiresAction: 'NONE', rotulo: null, atalho: null },
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
  /** true quando a sanitizacao reconheceu tentativa de injecao de prompt. */
  entrada_suspeita?: boolean;
  /** Padroes reconhecidos pela sanitizacao, para auditoria. */
  padroes_sanitizacao?: string[];
  latencia_ms: number;
}
