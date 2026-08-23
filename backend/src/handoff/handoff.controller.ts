import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { SessionService } from '../session/session.service';
import { HandoffService } from './handoff.service';

export class QueueHandoffDto {
  /** Id da sessao a transbordar. */
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class AcceptHandoffDto {
  @IsOptional()
  @IsString()
  operador?: string;
}

@Controller('api/v1/handoff')
export class HandoffController {
  constructor(
    private readonly handoff: HandoffService,
    private readonly sessions: SessionService,
  ) {}

  /** Enfileira o transbordo manualmente (o orquestrador tambem chama isto internamente). */
  @Post('queue')
  async queue(@Body() dto: QueueHandoffDto) {
    const contexto = await this.sessions.obterPorSessao(dto.sessionId);
    if (!contexto) throw new NotFoundException(`Sessao ${dto.sessionId} nao encontrada no cache.`);
    return this.handoff.enfileirar({
      contexto,
      motivo: dto.motivo ?? 'Transbordo solicitado via API',
    });
  }

  /** Fila viva do OmniDashboard (mesmo payload emitido por WebSocket). */
  @Get('queue')
  fila() {
    return this.handoff.listarFila();
  }

  @Post('queue/:protocolo/accept')
  aceitar(@Param('protocolo') protocolo: string, @Body() dto: AcceptHandoffDto) {
    return this.handoff.assumir(protocolo, dto?.operador ?? 'Mariana Costa');
  }
}
