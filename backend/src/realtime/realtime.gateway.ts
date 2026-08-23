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
import { Server, Socket } from 'socket.io';
import { ConversationService } from '../conversation/conversation.service';
import { SessionService } from '../session/session.service';
import { HandoffService } from '../handoff/handoff.service';

export const ROOM_DASHBOARD = 'dashboard';
export const roomSessao = (sessionId: string) => `session:${sessionId}`;

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly conversation: ConversationService,
    private readonly sessions: SessionService,
    @Inject(forwardRef(() => HandoffService)) private readonly handoff: HandoffService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Socket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket desconectado: ${client.id}`);
  }

  // ------------------------- Entrada nas salas -------------------------

  @SubscribeMessage('dashboard:join')
  async dashboardJoin(@ConnectedSocket() client: Socket) {
    client.join(ROOM_DASHBOARD);
    const fila = await this.handoff.listarFila();
    client.emit('queue:update', fila);
    return { ok: true, sala: ROOM_DASHBOARD, fila: fila.length };
  }

  @SubscribeMessage('customer:join')
  customerJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string }) {
    if (!body?.sessionId) return { ok: false };
    client.join(roomSessao(body.sessionId));
    return { ok: true, sala: roomSessao(body.sessionId) };
  }

  // ----------------------- Acoes do atendente --------------------------

  @SubscribeMessage('agent:accept')
  async agentAccept(@MessageBody() body: { protocolo: string; operador?: string }) {
    const card = await this.handoff.assumir(body.protocolo, body.operador ?? 'Mariana Costa');
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
  async agentMessage(@MessageBody() body: { sessionId: string; texto: string; operador?: string }) {
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
      operador: body.operador ?? 'Mariana Costa',
    };
    this.server.to(roomSessao(body.sessionId)).emit('message:new', payload);
    this.server.to(ROOM_DASHBOARD).emit('message:new', payload);
    return { ok: true };
  }

  @SubscribeMessage('agent:close')
  async agentClose(@MessageBody() body: { sessionId: string; protocolo?: string }) {
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
