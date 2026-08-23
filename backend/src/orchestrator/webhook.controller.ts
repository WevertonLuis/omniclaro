import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { CanalOrigem } from '../database/entities';
import { OrchestratorService } from './orchestrator.service';

export class InboundMessageDto {
  @IsString()
  @MinLength(1, { message: 'texto nao pode ser vazio' })
  texto: string;

  @IsOptional()
  @IsIn(['WHATSAPP', 'APP_MINHA_CLARO', 'PORTAL_WEB'])
  canal?: CanalOrigem;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsInt()
  clienteId?: number;
}

@Controller('api/v1/webhooks')
export class WebhookController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  /**
   * Ingestao de mensagem do cliente. Simula o webhook do WhatsApp Business API;
   * o mesmo endpoint atende App Minha Claro e Portal Web via campo `canal`.
   */
  @Post('messages')
  @HttpCode(200)
  async receber(@Body() dto: InboundMessageDto) {
    return this.orchestrator.processar(dto);
  }
}
