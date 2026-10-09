import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegraCuradoria, TipoRegra } from '../database/entities';
import { INTENCOES, IntencaoDetectada, NomeIntencao, ResultadoNlu, enriquecerIntencao } from '../nlu/nlu.types';

/** Mesma normalizacao usada na busca da fila. */
export function normalizar(texto: string): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Confianca atribuida quando uma regra de sinonimia dispara. */
const CONFIANCA_CURADORIA = 0.95;

@Injectable()
export class CuradoriaService {
  private readonly logger = new Logger(CuradoriaService.name);

  constructor(@InjectRepository(RegraCuradoria) private readonly regras: Repository<RegraCuradoria>) {}

  async listar(): Promise<RegraCuradoria[]> {
    return this.regras.find({ order: { ativo: 'DESC', data_criacao: 'DESC' } });
  }

  async criar(dados: {
    termo: string;
    intencaoAlvo: string;
    tipo: TipoRegra;
    criadoPor?: string;
    origemProtocolo?: string;
  }): Promise<RegraCuradoria> {
    const termo = normalizar(dados.termo);
    if (!termo) throw new NotFoundException('Termo vazio apos normalizacao.');
    if (!INTENCOES.includes(dados.intencaoAlvo as NomeIntencao)) {
      throw new NotFoundException(`Intencao desconhecida: ${dados.intencaoAlvo}`);
    }

    const salva = await this.regras.save(
      this.regras.create({
        termo,
        intencao_alvo: dados.intencaoAlvo,
        tipo: dados.tipo,
        ativo: true,
        criado_por: dados.criadoPor ?? null,
        origem_protocolo: dados.origemProtocolo ?? null,
      }),
    );
    this.logger.log(`Regra criada: "${termo}" ${dados.tipo} -> ${dados.intencaoAlvo}`);
    return salva;
  }

  async alternar(id: number): Promise<RegraCuradoria> {
    const regra = await this.regras.findOne({ where: { id } });
    if (!regra) throw new NotFoundException('Regra nao encontrada.');
    regra.ativo = !regra.ativo;
    return this.regras.save(regra);
  }

  async remover(id: number): Promise<{ ok: boolean }> {
    const r = await this.regras.delete({ id });
    return { ok: (r.affected ?? 0) > 0 };
  }

  /**
   * Aplica as regras ativas sobre o resultado do modelo.
   *
   * Roda DEPOIS do Gemini de proposito: a curadoria corrige a saida do modelo,
   * nao substitui o modelo. Assim um termo novo entra em producao na hora,
   * sem reimplantar, e o historico continua mostrando o que a IA havia dito.
   */
  async aplicar(textoOriginal: string, resultado: ResultadoNlu): Promise<ResultadoNlu> {
    const ativas = await this.regras.find({ where: { ativo: true } });
    if (!ativas.length) return resultado;

    const texto = normalizar(textoOriginal);
    const aplicadas: string[] = [];
    let intencoes: IntencaoDetectada[] = [...resultado.intencoes];

    for (const regra of ativas) {
      if (!regra.termo || !texto.includes(regra.termo)) continue;

      if (regra.tipo === 'SINONIMO') {
        const jaTem = intencoes.find((i) => i.nome === regra.intencao_alvo);
        if (jaTem) {
          // Ja identificou: a regra so reforca a confianca.
          if (jaTem.confianca < CONFIANCA_CURADORIA) jaTem.confianca = CONFIANCA_CURADORIA;
        } else {
          intencoes.push(
            enriquecerIntencao({
              nome: regra.intencao_alvo as NomeIntencao,
              confianca: CONFIANCA_CURADORIA,
              entidades: { origem: 'curadoria' },
            }),
          );
        }
        aplicadas.push(`${regra.termo} -> ${regra.intencao_alvo}`);
      } else {
        const antes = intencoes.length;
        intencoes = intencoes.filter((i) => i.nome !== regra.intencao_alvo);
        if (intencoes.length !== antes) aplicadas.push(`${regra.termo} bloqueia ${regra.intencao_alvo}`);
      }

      if (aplicadas.length) {
        await this.regras.increment({ id: regra.id }, 'acionamentos', 1);
      }
    }

    if (!aplicadas.length) return resultado;

    // Bloqueio pode zerar a lista: sem intencao, o fluxo precisa de um alvo.
    if (!intencoes.length) {
      intencoes.push(enriquecerIntencao({ nome: 'OUTROS', confianca: 0.3, entidades: {} }));
    }

    intencoes.sort((a, b) => b.confianca - a.confianca);
    this.logger.log(`Curadoria aplicada: ${aplicadas.join('; ')}`);

    return { ...resultado, intencoes, curadoria_aplicada: aplicadas };
  }
}
