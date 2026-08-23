import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { AppConfig } from '../config/configuration';
import { CanalOrigem } from '../database/entities';
import { ContextoSessao, TurnoHistorico } from './session.types';

const MAX_HISTORICO = 30;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly ttl: number;

  constructor(
    private readonly cache: CacheService,
    config: ConfigService,
  ) {
    this.ttl = config.get<AppConfig['cache']>('cache').sessionTtlSeconds;
  }

  private chaveCliente(clienteId: number) {
    return `session:customer:${clienteId}`;
  }

  private chaveIndice(sessionId: string) {
    return `session:index:${sessionId}`;
  }

  async obterPorCliente(clienteId: number): Promise<ContextoSessao | null> {
    const bruto = await this.cache.get(this.chaveCliente(clienteId));
    return bruto ? (JSON.parse(bruto) as ContextoSessao) : null;
  }

  async obterPorSessao(sessionId: string): Promise<ContextoSessao | null> {
    const clienteId = await this.cache.get(this.chaveIndice(sessionId));
    if (!clienteId) return null;
    return this.obterPorCliente(Number(clienteId));
  }

  async criar(clienteId: number, sessionId: string, canal: CanalOrigem): Promise<ContextoSessao> {
    const agora = new Date().toISOString();
    const ctx: ContextoSessao = {
      sessionId,
      clienteId,
      canal,
      status: 'ATIVA',
      protocolo: null,
      criadaEm: agora,
      atualizadaEm: agora,
      turnos: 0,
      historico: [],
      intencoesAcumuladas: [],
      ultimasIntencoes: [],
      ultimaFonte: null,
      ultimoResumo: null,
      ultimoSentimento: null,
      ultimaUrgencia: null,
      diagnostico: null,
      ofertaPendente: null,
      ofertaConfirmada: false,
    };
    await this.salvar(ctx);
    this.logger.log(`Sessao criada em cache [${this.cache.driver()}]: ${sessionId} (cliente ${clienteId}, TTL ${this.ttl}s)`);
    return ctx;
  }

  async salvar(ctx: ContextoSessao): Promise<ContextoSessao> {
    ctx.atualizadaEm = new Date().toISOString();
    if (ctx.historico.length > MAX_HISTORICO) {
      ctx.historico = ctx.historico.slice(-MAX_HISTORICO);
    }
    await this.cache.set(this.chaveCliente(ctx.clienteId), JSON.stringify(ctx), this.ttl);
    await this.cache.set(this.chaveIndice(ctx.sessionId), String(ctx.clienteId), this.ttl);
    return ctx;
  }

  async registrarTurno(ctx: ContextoSessao, turno: TurnoHistorico): Promise<ContextoSessao> {
    ctx.historico.push(turno);
    if (turno.remetente === 'CLIENTE') ctx.turnos += 1;
    return this.salvar(ctx);
  }

  async ttlRestante(clienteId: number): Promise<number> {
    return this.cache.ttl(this.chaveCliente(clienteId));
  }

  async encerrar(clienteId: number): Promise<void> {
    const ctx = await this.obterPorCliente(clienteId);
    if (ctx) await this.cache.del(this.chaveIndice(ctx.sessionId));
    await this.cache.del(this.chaveCliente(clienteId));
  }

  driver() {
    return this.cache.driver();
  }
}
