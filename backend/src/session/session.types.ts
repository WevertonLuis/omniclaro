import { CanalOrigem, StatusSessao } from '../database/entities';
import { DiagnosticoRede, Oferta } from '../mocks/mocks.service';

export interface TurnoHistorico {
  remetente: 'CLIENTE' | 'BOT' | 'ATENDENTE';
  texto: string;
  timestamp: string;
}

/** Documento guardado em Redis sob a chave session:customer:{id}, TTL 24h. */
export interface ContextoSessao {
  sessionId: string;
  clienteId: number;
  canal: CanalOrigem;
  status: StatusSessao;
  protocolo: string | null;
  criadaEm: string;
  atualizadaEm: string;
  turnos: number;
  historico: TurnoHistorico[];
  intencoesAcumuladas: string[];
  /** Intencoes da ultima analise, com o score real. Alimenta o card do dashboard. */
  ultimasIntencoes: { nome: string; confianca: number }[];
  ultimaFonte: string | null;
  ultimoResumo: string | null;
  ultimoSentimento: string | null;
  ultimaUrgencia: string | null;
  diagnostico: DiagnosticoRede | null;
  ofertaPendente: Oferta | null;
  ofertaConfirmada: boolean;
}
