import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [ConfigModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
