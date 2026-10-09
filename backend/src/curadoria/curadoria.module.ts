import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CuradoriaService } from './curadoria.service';

// Global: o NLU aplica as regras, e o painel do supervisor as administra.
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [CuradoriaService],
  exports: [CuradoriaService],
})
export class CuradoriaModule {}
