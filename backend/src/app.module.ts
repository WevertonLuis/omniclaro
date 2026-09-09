import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { ConversationModule } from './conversation/conversation.module';
import { DatabaseModule } from './database/database.module';
import { SeedService } from './database/seed.service';
import { HandoffModule } from './handoff/handoff.module';
import { MocksModule } from './mocks/mocks.module';
import { NluModule } from './nlu/nlu.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env', '../.env'] }),
    DatabaseModule,
    CacheModule,
    AuthModule,
    ConversationModule,
    SessionModule,
    NluModule,
    MocksModule,
    HandoffModule,
    RealtimeModule,
    OrchestratorModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    SeedService,
    // Autenticacao exigida por padrao. Rotas abertas se declaram com @Publico(),
    // o que evita esquecer de proteger um endpoint novo.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
