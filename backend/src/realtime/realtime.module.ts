import { Module, forwardRef } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { HandoffModule } from '../handoff/handoff.module';
import { SessionModule } from '../session/session.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [ConversationModule, SessionModule, forwardRef(() => HandoffModule)],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
