import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Operador, PapelOperador } from '../database/entities';
import { conferirSenha, gerarHash } from './senha.util';

export interface PayloadToken {
  sub: number;
  email: string;
  nome: string;
  papel: PapelOperador;
}

export interface RespostaLogin {
  accessToken: string;
  expiraEm: string;
  operador: {
    id: number;
    nome: string;
    email: string;
    papel: PapelOperador;
    turno: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Operador) private readonly operadores: Repository<Operador>,
    private readonly jwt: JwtService,
  ) {}

  async autenticar(email: string, senha: string): Promise<RespostaLogin> {
    const operador = await this.operadores.findOne({ where: { email: (email ?? '').trim().toLowerCase() } });

    // Mensagem unica para credencial errada e usuario inexistente: nao entrega
    // ao atacante a informacao de quais e-mails existem na base.
    const generico = new UnauthorizedException('E-mail ou senha invalidos.');
    if (!operador || !operador.ativo) throw generico;
    if (!(await conferirSenha(senha ?? '', operador.senha_hash))) throw generico;

    const payload: PayloadToken = {
      sub: operador.id,
      email: operador.email,
      nome: operador.nome,
      papel: operador.papel,
    };

    this.logger.log(`Login: ${operador.email} (${operador.papel})`);

    return {
      accessToken: await this.jwt.signAsync(payload),
      expiraEm: '8h',
      operador: {
        id: operador.id,
        nome: operador.nome,
        email: operador.email,
        papel: operador.papel,
        turno: operador.turno ?? null,
      },
    };
  }

  async buscarPorId(id: number): Promise<Operador | null> {
    return this.operadores.findOne({ where: { id } });
  }

  async listar(): Promise<Operador[]> {
    return this.operadores.find({ order: { id: 'ASC' } });
  }

  /** Cria os dois operadores da demonstracao. Idempotente. */
  async semear(): Promise<void> {
    const existentes = await this.operadores.count();
    if (existentes > 0) {
      this.logger.log(`Seed de operadores ja aplicado (${existentes} cadastrados)`);
      return;
    }

    await this.operadores.save([
      this.operadores.create({
        email: 'mariana.costa@claro.com.br',
        nome: 'Mariana Costa',
        senha_hash: await gerarHash('operador123'),
        papel: 'OPERADOR',
        turno: 'Turno A',
      }),
      this.operadores.create({
        email: 'rafael.lima@claro.com.br',
        nome: 'Rafael Lima',
        senha_hash: await gerarHash('operador123'),
        papel: 'OPERADOR',
        turno: 'Turno B',
      }),
      this.operadores.create({
        email: 'supervisor@claro.com.br',
        nome: 'Ana Beatriz Rocha',
        senha_hash: await gerarHash('supervisor123'),
        papel: 'SUPERVISOR',
        turno: 'Integral',
      }),
    ]);

    this.logger.log('Seed de operadores aplicado: 2 OPERADOR + 1 SUPERVISOR');
  }
}
