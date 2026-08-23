import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config/configuration';
import { NluService } from './nlu/nlu.service';
import { SessionService } from './session/session.service';

@Controller('api/v1')
export class AppController {
  constructor(
    private readonly config: ConfigService,
    private readonly nlu: NluService,
    private readonly sessions: SessionService,
  ) {}

  /** Sanidade da stack: qual driver de banco, cache e se o Gemini esta ativo. */
  @Get('health')
  health() {
    const db = this.config.get<AppConfig['db']>('db');
    const gemini = this.config.get<AppConfig['gemini']>('gemini');
    return {
      status: 'ok',
      servico: 'OmniClaro Orquestrador',
      persistencia: db.driver === 'postgres' ? `postgres://${db.host}:${db.port}/${db.database}` : `sqlite (${db.sqliteFile})`,
      cache: this.sessions.driver(),
      nlu: {
        motor: this.nlu.disponivel ? 'gemini' : 'fallback_heuristico',
        modelo: gemini.model,
        chave_configurada: Boolean(gemini.apiKey),
      },
      limiar_transbordo: this.config.get<number>('handoffConfidenceThreshold'),
      timestamp: new Date().toISOString(),
    };
  }
}
