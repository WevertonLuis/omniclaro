import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationModule } from '../conversation/conversation.module';
import { HandoffModule } from '../handoff/handoff.module';
import { MocksModule } from '../mocks/mocks.module';
import { NluModule } from '../nlu/nlu.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SessionModule } from '../session/session.module';
import { OrchestratorService } from './orchestrator.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ConfigModule, ConversationModule, SessionModule, NluModule, MocksModule, HandoffModule, RealtimeModule],
  controllers: [WebhookController],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
