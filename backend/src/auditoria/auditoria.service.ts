import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcaoAuditada, RegistroAuditoria } from '../database/entities';

export interface EntradaAuditoria {
  acao: AcaoAuditada;
  ator: string;
  papel?: string;
  ipOrigem?: string;
  recurso?: string;
  detalhe?: Record<string, unknown>;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(RegistroAuditoria) private readonly registros: Repository<RegistroAuditoria>,
  ) {}

  /**
   * Grava um evento na trilha. Nunca lanca: auditoria com falha nao pode
   * derrubar a operacao que estava sendo auditada — o erro vai para o log e a
   * requisicao segue.
   */
  async registrar(entrada: EntradaAuditoria): Promise<void> {
    try {
      await this.registros.save(
        this.registros.create({
          acao: entrada.acao,
          ator: entrada.ator,
          papel: entrada.papel ?? null,
          ip_origem: entrada.ipOrigem ?? null,
          recurso: entrada.recurso ?? null,
          detalhe: entrada.detalhe ?? null,
        }),
      );
    } catch (erro) {
      this.logger.error(`Falha ao gravar auditoria (${entrada.acao}): ${erro?.message}`);
    }
  }

  /** Leitura paginada, da mais recente para a mais antiga. */
  async listar(limite = 100): Promise<RegistroAuditoria[]> {
    return this.registros.find({ order: { timestamp: 'DESC', id: 'DESC' }, take: limite });
  }

  async total(): Promise<number> {
    return this.registros.count();
  }
}
