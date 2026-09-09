import { Controller, Get } from '@nestjs/common';
import { Papeis } from '../auth/auth.guard';
import { AdminService } from './admin.service';

/** Area restrita ao SUPERVISOR (RBAC da secao 8.2 da documentacao). */
@Papeis('SUPERVISOR')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  metricas() {
    return this.admin.metricas();
  }

  @Get('sessions')
  sessoes() {
    return this.admin.listarSessoes();
  }

  @Get('operators')
  operadores() {
    return this.admin.listarOperadores();
  }
}
