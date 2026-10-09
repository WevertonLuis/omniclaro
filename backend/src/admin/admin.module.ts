import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CuradoriaController } from './curadoria.controller';
import { MeController } from './me.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController, MeController, CuradoriaController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
