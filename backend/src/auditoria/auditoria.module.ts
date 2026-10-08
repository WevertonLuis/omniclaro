import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditoriaService } from './auditoria.service';

// Global: quase todo modulo precisa registrar algo na trilha.
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
