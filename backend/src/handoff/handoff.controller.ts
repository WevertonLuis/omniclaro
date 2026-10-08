import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Publico } from '../auth/auth.guard';
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

export class AvaliacaoDto {
  @IsInt({ message: 'a nota precisa ser um numero inteiro' })
  @Min(1, { message: 'a nota vai de 1 a 5' })
  @Max(5, { message: 'a nota vai de 1 a 5' })
  nota: number;
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

  /**
   * Avaliacao do cliente ao fim do atendimento humano.
   * Rota publica porque o chat do cliente nao e autenticado — a protecao vem
   * de exigir um protocolo existente e aceitar uma unica nota por atendimento.
   */
  @Publico()
  @Post('queue/:protocolo/csat')
  @HttpCode(200)
  avaliar(@Param('protocolo') protocolo: string, @Body() dto: AvaliacaoDto) {
    return this.handoff.avaliar(protocolo, dto.nota);
  }
}
