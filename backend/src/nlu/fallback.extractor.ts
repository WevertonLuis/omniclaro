import { IntencaoDetectada, ResultadoNlu } from './nlu.types';

interface Regra {
  intencao: IntencaoDetectada['nome'];
  termos: RegExp;
  confianca: number;
  entidade?: (texto: string) => Record<string, string>;
}

const REGRAS: Regra[] = [
  {
    intencao: 'FALAR_COM_ATENDENTE',
    termos: /\b(atendente|humano|pessoa de verdade|falar com algu[eé]m|suporte humano|operador)\b/i,
    confianca: 0.95,
  },
  {
    intencao: 'SUPORTE_TECNICO_SEM_CONEXAO',
    termos: /\b(sem internet|sem conex[aã]o|n[aã]o conecta|caiu de vez|internet n[aã]o funciona|offline)\b/i,
    confianca: 0.9,
    entidade: () => ({ sintoma: 'sem conexao' }),
  },
  {
    intencao: 'SUPORTE_TECNICO_INSTABILIDADE',
    termos: /\b(caindo|cai (toda|o tempo)|inst[aá]vel|instabilidade|oscilando|desconectando|quedas?)\b/i,
    confianca: 0.91,
    entidade: (t) => ({
      sintoma: 'queda intermitente',
      equipamento: /roteador/i.test(t) ? 'roteador' : 'modem',
      periodicidade: /toda hora/i.test(t) ? 'toda hora' : 'nao informado',
    }),
  },
  {
    intencao: 'SUPORTE_TECNICO_LENTIDAO',
    termos: /\b(lenta|lentid[aã]o|devagar|travando|buffer)\b/i,
    confianca: 0.87,
    entidade: () => ({ sintoma: 'lentidao' }),
  },
  {
    intencao: 'CONTRATACAO_SERVICO_STREAMING',
    termos: /\b(hbo|max|netflix|disney|paramount|globoplay|streaming|claro tv\+?|pacote de (canais|filmes))\b/i,
    confianca: 0.89,
    entidade: (t) => {
      const m = t.match(/\b(hbo max|hbo|netflix|disney\+?|paramount\+?|globoplay)\b/i);
      return { servico: m ? m[0] : 'streaming' };
    },
  },
  {
    intencao: 'CONFIRMACAO_CONTRATACAO',
    termos: /\b(confirmar|pode ativar|quero sim|aceito|pode contratar|fechado)\b/i,
    confianca: 0.88,
  },
  {
    intencao: 'SEGUNDA_VIA_FATURA',
    termos: /\b(2[ªa] via|segunda via|boleto|c[oó]digo de barras)\b/i,
    confianca: 0.9,
  },
  { intencao: 'CONSULTA_FATURA', termos: /\b(fatura|conta|cobran[çc]a|valor do m[eê]s)\b/i, confianca: 0.85 },
  { intencao: 'CANCELAMENTO', termos: /\b(cancelar|cancelamento|encerrar contrato|portabilidade)\b/i, confianca: 0.92 },
  { intencao: 'SAUDACAO', termos: /^\s*(oi|ol[aá]|bom dia|boa tarde|boa noite|e a[ií])\b/i, confianca: 0.8 },
];

/**
 * Extrator deterministico usado quando o Gemini falha (rede, quota, JSON malformado).
 * Mantem o fluxo ponta a ponta demonstravel e sinaliza a origem em `fonte`.
 */
export function extrairPorHeuristica(texto: string, latenciaMs = 0): ResultadoNlu {
  const intencoes: IntencaoDetectada[] = [];

  for (const regra of REGRAS) {
    if (regra.termos.test(texto)) {
      intencoes.push({
        nome: regra.intencao,
        confianca: regra.confianca,
        entidades: regra.entidade ? regra.entidade(texto) : {},
      });
    }
  }

  if (intencoes.length === 0) {
    // Nada reconhecido: confianca baixa proposital para acionar o transbordo.
    intencoes.push({ nome: 'OUTROS', confianca: 0.35, entidades: {} });
  }

  intencoes.sort((a, b) => b.confianca - a.confianca);

  const negativo = /\b(p[eé]ssimo|absurdo|revoltado|cansado|de novo|toda hora|nunca funciona)\b/i.test(texto);
  const requerHumano = intencoes.some((i) => i.nome === 'FALAR_COM_ATENDENTE' || i.nome === 'CANCELAMENTO');

  return {
    intencoes,
    sentimento: negativo ? 'FRUSTRADO' : 'NEUTRO',
    urgencia: negativo || requerHumano ? 'ALTA' : 'MEDIA',
    resumo: `[Fallback heuristico - Gemini indisponivel] Cliente escreveu: "${texto.slice(0, 180)}". Intencoes reconhecidas por palavra-chave: ${intencoes
      .map((i) => i.nome)
      .join(', ')}.`,
    requer_humano: requerHumano,
    fonte: 'FALLBACK_HEURISTICO',
    latencia_ms: latenciaMs,
  };
}
