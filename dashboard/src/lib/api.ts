import type { HandoffCard } from './types';

export async function buscarFila(): Promise<HandoffCard[]> {
  const r = await fetch('/api/v1/handoff/queue');
  if (!r.ok) throw new Error('Falha ao carregar a fila de transbordo');
  return r.json();
}

export async function buscarHealth() {
  const r = await fetch('/api/v1/health');
  return r.json();
}
