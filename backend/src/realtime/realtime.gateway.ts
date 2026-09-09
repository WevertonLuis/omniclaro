import { Inject, Logger, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PayloadToken } from '../auth/auth.service';
import { ConversationService } from '../conversation/conversation.service';
import { SessionService } from '../session/session.service';
import { HandoffService } from '../handoff/handoff.service';

export const ROOM_DASHBOARD = 'dashboard';
export const roomSessao = (sessionId: string) => `session:${sessionId}`;

/** Socket com o operador autenticado anexado apos dashboard:join. */
interface SocketOperador extends Socket {
  operador?: PayloadToken;
}

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly conversation: ConversationService,
    private readonly sessions: SessionService,
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => HandoffService)) private readonly handoff: HandoffService,
  ) {}

  /** Le o token enviado no dashboard:join. Sem token valido, nada de sala. */
  private autenticar(client: SocketOperador, token?: string): PayloadToken | null {
    if (!token) return null;
    try {
      const payload = this.jwt.verify<PayloadToken>(token);
      client.operador = payload;
      return payload;
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Socket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket desconectado: ${client.id}`);
  }

  // ------------------------- Entrada nas salas -------------------------

  @SubscribeMessage('dashboard:join')
  async dashboardJoin(@ConnectedSocket() client: SocketOperador, @MessageBody() body?: { token?: string }) {
    const operador = this.autenticar(client, body?.token);
    if (!operador) return { ok: false, erro: 'Token ausente ou invalido.' };

    client.join(ROOM_DASHBOARD);
    const fila = await this.handoff.listarFila();
    client.emit('queue:update', fila);
    this.logger.log(`${operador.nome} (${operador.papel}) entrou no painel`);
    return { ok: true, sala: ROOM_DASHBOARD, fila: fila.length, operador: operador.nome };
  }

  @SubscribeMessage('customer:join')
  customerJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string }) {
    if (!body?.sessionId) return { ok: false };
    client.join(roomSessao(body.sessionId));
    return { ok: true, sala: roomSessao(body.sessionId) };
  }

  // ----------------------- Acoes do atendente --------------------------

  @SubscribeMessage('agent:accept')
  async agentAccept(@ConnectedSocket() client: SocketOperador, @MessageBody() body: { protocolo: string }) {
    // O nome vem do token, nao do payload: o cliente nao escolhe quem assumiu.
    if (!client.operador) return { ok: false, erro: 'Nao autenticado.' };
    const card = await this.handoff.assumir(body.protocolo, client.operador.nome);
    this.emitirFila();
    this.server.to(roomSessao(card.sessionId)).emit('session:status', {
      sessionId: card.sessionId,
      status: 'EM_ATENDIMENTO',
      operador: card.operador,
    });
    this.server.to(roomSessao(card.sessionId)).emit('message:new', {
      sessionId: card.sessionId,
      remetente: 'ATENDENTE',
      texto: `Ola! Eu sou ${card.operador}, da Claro. Assumi seu atendimento e ja estou com todo o historico aqui. Vou continuar daqui.`,
      timestamp: new Date().toISOString(),
      operador: card.operador,
    });
    return card;
  }

  @SubscribeMessage('agent:message')
  async agentMessage(@ConnectedSocket() client: SocketOperador, @MessageBody() body: { sessionId: string; texto: string }) {
    if (!client.operador) return { ok: false, erro: 'Nao autenticado.' };
    if (!body?.sessionId || !body?.texto?.trim()) return { ok: false };

    await this.conversation.registrarMensagem(body.sessionId, 'ATENDENTE', body.texto);
    const ctx = await this.sessions.obterPorSessao(body.sessionId);
    if (ctx) {
      await this.sessions.registrarTurno(ctx, {
        remetente: 'ATENDENTE',
        texto: body.texto,
        timestamp: new Date().toISOString(),
      });
    }

    const payload = {
      sessionId: body.sessionId,
      remetente: 'ATENDENTE' as const,
      texto: body.texto,
      timestamp: new Date().toISOString(),
      operador: client.operador.nome,
    };
    this.server.to(roomSessao(body.sessionId)).emit('message:new', payload);
    this.server.to(ROOM_DASHBOARD).emit('message:new', payload);
    return { ok: true };
  }

  @SubscribeMessage('agent:close')
  async agentClose(@ConnectedSocket() client: SocketOperador, @MessageBody() body: { sessionId: string; protocolo?: string }) {
    if (!client.operador) return { ok: false, erro: 'Nao autenticado.' };
    await this.handoff.encerrar(body.sessionId, body.protocolo);
    this.emitirFila();
    this.server.to(roomSessao(body.sessionId)).emit('session:status', {
      sessionId: body.sessionId,
      status: 'ENCERRADA',
    });
    return { ok: true };
  }

  // --------------------- Emissores usados pelo dominio ------------------

  emitirHandoff(card: unknown) {
    this.server?.to(ROOM_DASHBOARD).emit('handoff:new', card);
    this.emitirFila();
  }

  async emitirFila() {
    if (!this.server) return;
    this.server.to(ROOM_DASHBOARD).emit('queue:update', await this.handoff.listarFila());
  }

  emitirMensagem(sessionId: string, remetente: 'CLIENTE' | 'BOT' | 'ATENDENTE', texto: string, extra: object = {}) {
    const payload = { sessionId, remetente, texto, timestamp: new Date().toISOString(), ...extra };
    this.server?.to(ROOM_DASHBOARD).emit('message:new', payload);
    this.server?.to(roomSessao(sessionId)).emit('message:new', payload);
  }

  emitirContexto(sessionId: string, contexto: unknown) {
    this.server?.to(ROOM_DASHBOARD).emit('context:update', { sessionId, contexto });
  }
}
