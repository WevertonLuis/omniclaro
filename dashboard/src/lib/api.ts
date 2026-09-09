import type { HandoffCard } from './types';

export async function buscarFila(token: string): Promise<HandoffCard[]> {
  const r = await fetch('/api/v1/handoff/queue', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('Falha ao carregar a fila de transbordo');
  return r.json();
}

export async function buscarHealth() {
  const r = await fetch('/api/v1/health');
  return r.json();
}
