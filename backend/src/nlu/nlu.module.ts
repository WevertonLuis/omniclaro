import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NluController } from './nlu.controller';
import { NluService } from './nlu.service';

@Module({
  imports: [ConfigModule],
  controllers: [NluController],
  providers: [NluService],
  exports: [NluService],
})
export class NluModule {}
