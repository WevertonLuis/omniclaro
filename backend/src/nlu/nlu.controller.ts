import { Body, Controller, Post } from '@nestjs/common';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { NluService } from './nlu.service';

export class ProcessIntentDto {
  @IsString()
  @MinLength(1)
  texto: string;

  @IsOptional()
  @IsObject()
  contexto?: {
    nomeCliente?: string;
    planoCliente?: string;
    historico?: { remetente: string; texto: string }[];
  };
}

@Controller('api/v1/nlp')
export class NluController {
  constructor(private readonly nlu: NluService) {}

  /** Endpoint isolado para testar o structured output do Gemini sem passar pelo orquestrador. */
  @Post('process-intent')
  async processIntent(@Body() dto: ProcessIntentDto) {
    const resultado = await this.nlu.processarIntencao(dto.texto, dto.contexto ?? {});
    return { motor_disponivel: this.nlu.disponivel, ...resultado };
  }
}
