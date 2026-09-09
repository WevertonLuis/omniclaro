import { Body, Controller, Get, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Publico, RequisicaoAutenticada } from './auth.guard';

export class LoginDto {
  @IsEmail({}, { message: 'informe um e-mail valido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'a senha precisa de ao menos 6 caracteres' })
  senha: string;
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.autenticar(dto.email, dto.senha);
  }

  /** Devolve o operador do token. Usado pelo front para restaurar a sessao. */
  @Get('me')
  async me(@Req() req: RequisicaoAutenticada) {
    const operador = await this.auth.buscarPorId(req.operador.sub);
    if (!operador || !operador.ativo) throw new UnauthorizedException('Operador inativo.');
    return {
      id: operador.id,
      nome: operador.nome,
      email: operador.email,
      papel: operador.papel,
      turno: operador.turno ?? null,
    };
  }
}
