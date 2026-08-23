import type { HandoffCard } from '../lib/types';
import { duracao, horaCurta } from '../lib/mask';
import { BoltIcon, UserIcon } from './icons';

interface Props {
  fila: HandoffCard[];
  conectado: boolean;
  onAssumir: (card: HandoffCard) => void;
}

/**
 * Tela intermediaria: fila de transbordo. Assim que o atendente assume um card,
 * a aplicacao troca para o layout de atendimento (barra de chamada + chat + AI panel).
 */
export default function QueueScreen({ fila, conectado, onAssumir }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-ink-900">Fila de transbordo</h1>
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              Sessoes escaladas pelo orquestrador, com resumo cognitivo pronto para assumir.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink-700 shadow-card">
            {fila.length} na fila
          </span>
        </div>

        {!conectado && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
            WebSocket desconectado. Verifique se o orquestrador esta rodando em
            <span className="font-mono"> http://localhost:3000</span>.
          </div>
        )}

        {fila.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hair bg-white/60 px-6 py-14 text-center">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-canvas text-ink-400">
              <BoltIcon className="h-4 w-4" />
            </div>
            <p className="text-[13.5px] font-medium text-ink-700">Nenhum transbordo na fila</p>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-ink-500">
              Abra o chat do cliente em <span className="font-mono">http://localhost:5174</span> e peca para falar
              com um atendente. O card aparece aqui em tempo real, via WebSocket.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {fila.map((card) => (
              <li key={card.protocolo} className="rounded-xl bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-claro-rose text-claro-red">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink-900">{card.cliente.nome}</p>
                      <p className="text-[11.5px] text-ink-500">
                        {card.cliente.telefoneFormatado} &middot; {card.canal} &middot; #{card.protocolo}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right leading-tight">
                      <div className="text-[11px] text-ink-400">espera</div>
                      <div className="text-[13px] font-bold tabular-nums text-ink-900">
                        {duracao(card.tempoEsperaSegundos)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAssumir(card)}
                      className="rounded-md bg-claro-red px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-claro-dark"
                    >
                      {card.status === 'EM_ATENDIMENTO' ? 'Retomar' : 'Assumir'}
                    </button>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 rounded-lg border border-hair bg-canvas/60 p-3 text-[12.5px] leading-relaxed text-ink-700">
                  {card.ia.resumo}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10.5px] text-ink-400">
                  <span className="rounded bg-canvas px-1.5 py-0.5 text-ink-500">{card.motivo}</span>
                  {card.ia.intencoes.slice(0, 3).map((i) => (
                    <span key={i.nome} className="font-mono">
                      {i.nome} {(i.confianca * 100).toFixed(0)}%
                    </span>
                  ))}
                  <span className="ml-auto">entrou as {horaCurta(card.entrouNaFilaEm)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
