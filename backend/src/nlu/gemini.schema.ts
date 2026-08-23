import { SchemaType } from '@google/generative-ai';
import { INTENCOES, SENTIMENTOS, URGENCIAS } from './nlu.types';

/**
 * Schema JSON forcado (structured output). O Gemini e obrigado a devolver
 * exatamente esta forma, o que elimina parsing de texto livre.
 */
export const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    intencoes: {
      type: SchemaType.ARRAY,
      description: 'Todas as intencoes presentes na mensagem. Uma mensagem pode conter varias.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          nome: { type: SchemaType.STRING, format: 'enum', enum: [...INTENCOES] },
          confianca: {
            type: SchemaType.NUMBER,
            description: 'Confianca entre 0.0 e 1.0.',
          },
          entidades: {
            type: SchemaType.OBJECT,
            description: 'Entidades associadas a esta intencao.',
            properties: {
              servico: { type: SchemaType.STRING, description: 'Ex.: HBO Max, Netflix, Wi-Fi' },
              equipamento: { type: SchemaType.STRING, description: 'Ex.: modem, roteador, decodificador' },
              sintoma: { type: SchemaType.STRING, description: 'Ex.: queda intermitente, sem sinal' },
              periodicidade: { type: SchemaType.STRING, description: 'Ex.: toda hora, desde ontem' },
              valor: { type: SchemaType.STRING, description: 'Valor monetario citado' },
            },
          },
        },
        required: ['nome', 'confianca'],
      },
    },
    sentimento: { type: SchemaType.STRING, format: 'enum', enum: [...SENTIMENTOS] },
    urgencia: { type: SchemaType.STRING, format: 'enum', enum: [...URGENCIAS] },
    resumo: {
      type: SchemaType.STRING,
      description:
        'Resumo cognitivo em portugues do Brasil, 2 a 3 frases, escrito para o atendente humano que pode assumir o caso.',
    },
    requer_humano: {
      type: SchemaType.BOOLEAN,
      description: 'true se o cliente pediu atendente humano ou se o caso excede a automacao.',
    },
  },
  required: ['intencoes', 'sentimento', 'urgencia', 'resumo', 'requer_humano'],
} as const;

export const SYSTEM_PROMPT = `Voce e o motor de NLU do OmniClaro, orquestrador conversacional da Claro que unifica suporte tecnico, faturamento e vendas nos canais WhatsApp, App Minha Claro e Portal Web.

Sua unica funcao e analisar a mensagem do cliente e devolver JSON valido no schema fornecido. Nunca responda ao cliente, nunca escreva texto fora do JSON.

Regras:
1. Uma mensagem pode conter MULTIPLAS intencoes simultaneas. Extraia todas. Exemplo: "meu wifi cai toda hora e queria saber do pacote com HBO" contem SUPORTE_TECNICO_INSTABILIDADE e CONTRATACAO_SERVICO_STREAMING.
2. Atribua confianca calibrada: acima de 0.85 apenas quando a intencao for explicita e inequivoca. Use valores baixos (abaixo de 0.6) para mensagens vagas ou ambiguas.
3. Marque requer_humano=true se o cliente pedir atendente/humano/pessoa, ameacar cancelar por insatisfacao, ou se o pedido sair do escopo de suporte de banda larga, faturamento e contratacao de servicos.
4. O campo resumo e lido por um atendente humano no painel. Escreva de forma objetiva, citando o nome do problema, o que ja foi tentado e o estado emocional do cliente.
5. Ordene o array intencoes da maior para a menor confianca.`;
