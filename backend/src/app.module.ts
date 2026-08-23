import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AppController } from './app.controller';
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
    ConversationModule,
    SessionModule,
    NluModule,
    MocksModule,
    HandoffModule,
    RealtimeModule,
    OrchestratorModule,
  ],
  controllers: [AppController],
  providers: [SeedService],
})
export class AppModule {}
