import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { AppConfig } from '../config/configuration';
import { extrairPorHeuristica } from './fallback.extractor';
import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from './gemini.schema';
import { INTENCOES, IntencaoDetectada, ResultadoNlu, SENTIMENTOS, URGENCIAS } from './nlu.types';

export interface ContextoNlu {
  nomeCliente?: string;
  planoCliente?: string;
  historico?: { remetente: string; texto: string }[];
}

@Injectable()
export class NluService {
  private readonly logger = new Logger(NluService.name);
  private readonly model: GenerativeModel | null;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const cfg = this.config.get<AppConfig['gemini']>('gemini');
    this.modelName = cfg.model;

    if (!cfg.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY ausente. O motor de NLU vai operar apenas com o fallback heuristico. ' +
          'Preencha backend/.env para ativar o Gemini.',
      );
      this.model = null;
      return;
    }

    const genAI = new GoogleGenerativeAI(cfg.apiKey);

    // Os modelos Gemini 3.x raciocinam antes de responder por padrao, o que leva
    // a resposta de ~1,3s para ~20s. Extracao de intencao com schema fechado nao
    // precisa disso. `thinkingLevel` so existe na familia 3.x — em modelos mais
    // antigos deixe GEMINI_THINKING_LEVEL vazio para omitir o campo.
    const generationConfig: Record<string, unknown> = {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    };
    if (cfg.thinkingLevel) {
      generationConfig.thinkingConfig = { thinkingLevel: cfg.thinkingLevel };
    }

    this.model = genAI.getGenerativeModel({
      model: cfg.model,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: generationConfig as any,
    });
    this.logger.log(
      `Motor de NLU: Gemini (${cfg.model}) com structured output ativo` +
        (cfg.thinkingLevel ? ` | thinkingLevel=${cfg.thinkingLevel}` : ''),
    );
  }

  get disponivel(): boolean {
    return this.model !== null;
  }

  async processarIntencao(texto: string, contexto: ContextoNlu = {}): Promise<ResultadoNlu> {
    const inicio = Date.now();

    if (!this.model) {
      return extrairPorHeuristica(texto, Date.now() - inicio);
    }

    try {
      const prompt = this.montarPrompt(texto, contexto);
      const resposta = await this.model.generateContent(prompt);
      const bruto = resposta.response.text();
      const parsed = this.parseSeguro(bruto);

      if (!parsed) {
        this.logger.warn(`Resposta do Gemini nao parseavel, aplicando fallback. Bruto: ${bruto?.slice(0, 200)}`);
        return extrairPorHeuristica(texto, Date.now() - inicio);
      }

      return this.normalizar(parsed, Date.now() - inicio);
    } catch (erro) {
      // O SDK nem sempre popula `message` (ex.: 404 de modelo descontinuado
      // chega com o corpo so em toString), entao caimos por varios formatos.
      const detalhe =
        erro?.message?.trim() ||
        String(erro ?? '').trim() ||
        JSON.stringify(erro) ||
        'erro sem descricao';
      this.logger.error(`Falha na chamada ao Gemini (${this.modelName}): ${detalhe}`);
      if (/not found|no longer available|is not supported/i.test(detalhe)) {
        this.logger.error(
          `O modelo "${this.modelName}" nao esta disponivel para esta chave. ` +
            'Ajuste GEMINI_MODEL no .env — a lista de modelos habilitados esta em ' +
            'https://generativelanguage.googleapis.com/v1beta/models',
        );
      }
      return extrairPorHeuristica(texto, Date.now() - inicio);
    }
  }

  private montarPrompt(texto: string, ctx: ContextoNlu): string {
    const historico =
      ctx.historico?.length > 0
        ? ctx.historico
            .slice(-6)
            .map((m) => `${m.remetente}: ${m.texto}`)
            .join('\n')
        : '(primeira mensagem da sessao)';

    return [
      '### Contexto do cliente',
      `Nome: ${ctx.nomeCliente ?? 'nao identificado'}`,
      `Plano: ${ctx.planoCliente ?? 'nao identificado'}`,
      '',
      '### Historico recente da conversa',
      historico,
      '',
      '### Mensagem a analisar',
      texto,
    ].join('\n');
  }

  /** Aceita JSON puro ou embrulhado em cerca de codigo. */
  private parseSeguro(bruto: string): any | null {
    if (!bruto) return null;
    const limpo = bruto.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
      return JSON.parse(limpo);
    } catch {
      const inicio = limpo.indexOf('{');
      const fim = limpo.lastIndexOf('}');
      if (inicio === -1 || fim <= inicio) return null;
      try {
        return JSON.parse(limpo.slice(inicio, fim + 1));
      } catch {
        return null;
      }
    }
  }

  /** Blinda o dominio contra campos faltantes ou fora do dominio esperado. */
  private normalizar(bruto: any, latenciaMs: number): ResultadoNlu {
    const intencoes: IntencaoDetectada[] = (Array.isArray(bruto.intencoes) ? bruto.intencoes : [])
      .filter((i: any) => i && INTENCOES.includes(i.nome))
      .map((i: any) => ({
        nome: i.nome,
        confianca: Math.max(0, Math.min(1, Number(i.confianca) || 0)),
        entidades: this.limparEntidades(i.entidades),
      }))
      .sort((a, b) => b.confianca - a.confianca);

    if (intencoes.length === 0) {
      intencoes.push({ nome: 'OUTROS', confianca: 0.3, entidades: {} });
    }

    return {
      intencoes,
      sentimento: SENTIMENTOS.includes(bruto.sentimento) ? bruto.sentimento : 'NEUTRO',
      urgencia: URGENCIAS.includes(bruto.urgencia) ? bruto.urgencia : 'MEDIA',
      resumo: typeof bruto.resumo === 'string' && bruto.resumo.trim() ? bruto.resumo.trim() : 'Sem resumo gerado.',
      requer_humano: Boolean(bruto.requer_humano),
      fonte: 'GEMINI',
      latencia_ms: latenciaMs,
    };
  }

  private limparEntidades(ent: any): Record<string, string> {
    if (!ent || typeof ent !== 'object') return {};
    return Object.fromEntries(
      Object.entries(ent)
        .filter(([, v]) => typeof v === 'string' && v.trim() && v !== 'null')
        .map(([k, v]) => [k, String(v).trim()]),
    );
  }
}
