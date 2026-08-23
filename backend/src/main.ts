import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  const db = config.get<AppConfig['db']>('db');
  const cache = config.get<AppConfig['cache']>('cache');
  const gemini = config.get<AppConfig['gemini']>('gemini');

  const logger = new Logger('OmniClaro');
  logger.log('====================================================');
  logger.log(`  OmniClaro Orquestrador  ->  http://localhost:${port}`);
  logger.log(`  Persistencia : ${db.driver}`);
  logger.log(`  Cache/Sessao : ${cache.driver} (TTL ${cache.sessionTtlSeconds}s)`);
  logger.log(`  NLU          : ${gemini.apiKey ? `Gemini ${gemini.model}` : 'FALLBACK heuristico (defina GEMINI_API_KEY)'}`);
  logger.log(`  WebSocket    : ws://localhost:${port}`);
  logger.log('====================================================');
}

bootstrap();
