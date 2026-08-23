import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { SessionService } from './session.service';

@Controller('api/v1/sessions')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  /** Recupera o contexto vivo da sessao direto do Redis (ou do cache em memoria). */
  @Get(':id')
  async obter(@Param('id') id: string) {
    const ctx = await this.sessions.obterPorSessao(id);
    if (!ctx) throw new NotFoundException(`Sessao ${id} nao encontrada ou expirada no cache.`);
    return {
      ...ctx,
      _cache: {
        driver: this.sessions.driver(),
        chave: `session:customer:${ctx.clienteId}`,
        ttl_restante_segundos: await this.sessions.ttlRestante(ctx.clienteId),
      },
    };
  }
}
