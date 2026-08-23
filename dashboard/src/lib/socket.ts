import { io, Socket } from 'socket.io-client';

/** Vite faz proxy de /socket.io para o orquestrador em :3000 (ver vite.config.ts). */
export const socket: Socket = io('/', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});
