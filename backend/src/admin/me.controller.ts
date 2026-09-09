import { Controller, Get, Req } from '@nestjs/common';
import { RequisicaoAutenticada } from '../auth/auth.guard';
import { AdminService } from './admin.service';

/**
 * Painel do proprio operador. Sem @Papeis: qualquer operador autenticado
 * acessa — mas sempre os proprios numeros, porque o nome vem do token.
 */
@Controller('api/v1/me')
export class MeController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  metricas(@Req() req: RequisicaoAutenticada) {
    return this.admin.metricasDoOperador(req.operador.nome);
  }
}
