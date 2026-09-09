import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PapelOperador } from '../database/entities';
import { PayloadToken } from './auth.service';

export const CHAVE_PAPEIS = 'papeis_exigidos';

/** Restringe a rota aos papeis informados. Ex.: @Papeis('SUPERVISOR') */
export const Papeis = (...papeis: PapelOperador[]) => SetMetadata(CHAVE_PAPEIS, papeis);

export const CHAVE_PUBLICO = 'rota_publica';

/** Libera a rota da exigencia de token. */
export const Publico = () => SetMetadata(CHAVE_PUBLICO, true);

export interface RequisicaoAutenticada extends Request {
  operador?: PayloadToken;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publico) return true;

    const req = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    const token = this.extrairToken(req);
    if (!token) throw new UnauthorizedException('Token de acesso ausente.');

    let payload: PayloadToken;
    try {
      payload = await this.jwt.verifyAsync<PayloadToken>(token);
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado.');
    }
    req.operador = payload;

    const papeisExigidos = this.reflector.getAllAndOverride<PapelOperador[]>(CHAVE_PAPEIS, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (papeisExigidos?.length && !papeisExigidos.includes(payload.papel)) {
      throw new ForbiddenException(
        `Acesso restrito ao papel ${papeisExigidos.join(' ou ')}. Seu papel: ${payload.papel}.`,
      );
    }

    return true;
  }

  private extrairToken(req: Request): string | null {
    const cabecalho = req.headers.authorization ?? '';
    const [tipo, valor] = cabecalho.split(' ');
    return tipo === 'Bearer' && valor ? valor : null;
  }
}
