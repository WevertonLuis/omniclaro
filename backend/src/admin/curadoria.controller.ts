import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Papeis, RequisicaoAutenticada } from '../auth/auth.guard';
import { CuradoriaService } from '../curadoria/curadoria.service';
import { TipoRegra } from '../database/entities';
import { INTENCOES } from '../nlu/nlu.types';

export class NovaRegraDto {
  @IsString()
  @MinLength(2, { message: 'o termo precisa de ao menos 2 caracteres' })
  termo: string;

  @IsIn(INTENCOES as unknown as string[], { message: 'intencao desconhecida' })
  intencaoAlvo: string;

  @IsIn(['SINONIMO', 'BLOQUEIO'])
  tipo: TipoRegra;

  @IsOptional()
  @IsString()
  origemProtocolo?: string;
}

/**
 * Curadoria de NLU. Restrita ao SUPERVISOR: muda como o sistema interpreta
 * mensagens de cliente, entao nao e algo que cada operador ajusta sozinho.
 */
@Papeis('SUPERVISOR')
@Controller('api/v1/admin/curadoria')
export class CuradoriaController {
  constructor(
    private readonly curadoria: CuradoriaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  @Get()
  async listar() {
    const regras = await this.curadoria.listar();
    return {
      intencoesDisponiveis: INTENCOES,
      regras: regras.map((r) => ({
        id: r.id,
        termo: r.termo,
        intencaoAlvo: r.intencao_alvo,
        tipo: r.tipo,
        ativo: r.ativo,
        criadoPor: r.criado_por ?? '—',
        origemProtocolo: r.origem_protocolo ?? null,
        acionamentos: r.acionamentos,
        dataCriacao: new Date(r.data_criacao).toISOString(),
      })),
    };
  }

  @Post()
  async criar(@Body() dto: NovaRegraDto, @Req() req: RequisicaoAutenticada) {
    const regra = await this.curadoria.criar({
      termo: dto.termo,
      intencaoAlvo: dto.intencaoAlvo,
      tipo: dto.tipo,
      criadoPor: req.operador?.email,
      origemProtocolo: dto.origemProtocolo,
    });
    await this.auditoria.registrar({
      acao: 'CURADORIA_ALTERADA',
      ator: req.operador?.email ?? 'desconhecido',
      papel: req.operador?.papel,
      ipOrigem: req.ip,
      recurso: `regra:${regra.id}`,
      detalhe: { operacao: 'criar', termo: regra.termo, tipo: regra.tipo, alvo: regra.intencao_alvo },
    });
    return regra;
  }

  @Patch(':id/alternar')
  async alternar(@Param('id', ParseIntPipe) id: number, @Req() req: RequisicaoAutenticada) {
    const regra = await this.curadoria.alternar(id);
    await this.auditoria.registrar({
      acao: 'CURADORIA_ALTERADA',
      ator: req.operador?.email ?? 'desconhecido',
      papel: req.operador?.papel,
      ipOrigem: req.ip,
      recurso: `regra:${id}`,
      detalhe: { operacao: regra.ativo ? 'ativar' : 'desativar', termo: regra.termo },
    });
    return regra;
  }

  @Delete(':id')
  async remover(@Param('id', ParseIntPipe) id: number, @Req() req: RequisicaoAutenticada) {
    const resultado = await this.curadoria.remover(id);
    await this.auditoria.registrar({
      acao: 'CURADORIA_ALTERADA',
      ator: req.operador?.email ?? 'desconhecido',
      papel: req.operador?.papel,
      ipOrigem: req.ip,
      recurso: `regra:${id}`,
      detalhe: { operacao: 'remover' },
    });
    return resultado;
  }
}
