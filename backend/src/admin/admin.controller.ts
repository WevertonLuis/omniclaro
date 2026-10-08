import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Papeis, RequisicaoAutenticada } from '../auth/auth.guard';
import { AcaoAuditada } from '../database/entities';
import { AdminService } from './admin.service';

/** Area restrita ao SUPERVISOR (RBAC da secao 8.2 da documentacao). */
@Papeis('SUPERVISOR')
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /**
   * Toda consulta a esta area gera registro na trilha: a secao 8.2 pede
   * auditoria de consulta, nao so de alteracao.
   */
  private async auditar(req: RequisicaoAutenticada, acao: AcaoAuditada, recurso: string) {
    await this.auditoria.registrar({
      acao,
      ator: req.operador?.email ?? 'desconhecido',
      papel: req.operador?.papel,
      ipOrigem: req.ip,
      recurso,
    });
  }

  @Get('metrics')
  async metricas(@Req() req: RequisicaoAutenticada) {
    await this.auditar(req, 'CONSULTA_METRICAS', '/api/v1/admin/metrics');
    return this.admin.metricas();
  }

  @Get('sessions')
  async sessoes(@Req() req: RequisicaoAutenticada) {
    await this.auditar(req, 'CONSULTA_SESSOES', '/api/v1/admin/sessions');
    return this.admin.listarSessoes();
  }

  @Get('operators')
  async operadores(@Req() req: RequisicaoAutenticada) {
    await this.auditar(req, 'CONSULTA_OPERADORES', '/api/v1/admin/operators');
    return this.admin.listarOperadores();
  }

  /** Trilha de auditoria. Ler a trilha tambem fica registrado nela. */
  @Get('audit')
  async trilha(@Req() req: RequisicaoAutenticada, @Query('limite') limite?: string) {
    await this.auditar(req, 'CONSULTA_AUDITORIA', '/api/v1/admin/audit');
    const quantos = Math.min(Math.max(parseInt(limite ?? '50', 10) || 50, 1), 200);
    const [registros, total] = await Promise.all([this.auditoria.listar(quantos), this.auditoria.total()]);
    return {
      total,
      registros: registros.map((r) => ({
        id: r.id,
        acao: r.acao,
        ator: r.ator,
        papel: r.papel ?? '—',
        ipOrigem: r.ip_origem ?? '—',
        recurso: r.recurso ?? '—',
        detalhe: r.detalhe ?? null,
        timestamp: new Date(r.timestamp).toISOString(),
      })),
    };
  }
}
