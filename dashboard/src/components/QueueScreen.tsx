import { useMemo, useState } from 'react';
import type { HandoffCard, NivelPrioridade } from '../lib/types';
import { duracao, horaCurta } from '../lib/mask';
import { BoltIcon, UserIcon } from './icons';

interface Props {
  fila: HandoffCard[];
  conectado: boolean;
  onAssumir: (card: HandoffCard) => void;
}

/**
 * Paleta de prioridade. O nivel SEMPRE aparece escrito ao lado da cor:
 * o par vermelho/verde e indistinguivel em deuteranopia, entao cor sozinha
 * nao pode ser o unico canal de informacao numa fila de triagem.
 */
const ESTILO_PRIORIDADE: Record<NivelPrioridade, { chip: string; barra: string; rotulo: string }> = {
  CRITICA: { chip: 'border-rose-300 bg-rose-100 text-rose-800', barra: 'bg-rose-500', rotulo: 'Crítica' },
  ALTA: { chip: 'border-amber-300 bg-amber-100 text-amber-800', barra: 'bg-amber-500', rotulo: 'Alta' },
  MEDIA: { chip: 'border-sky-200 bg-sky-50 text-sky-800', barra: 'bg-sky-400', rotulo: 'Média' },
  BAIXA: { chip: 'border-hair bg-canvas text-ink-500', barra: 'bg-ink-400/40', rotulo: 'Baixa' },
};

const NIVEIS: NivelPrioridade[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'];

/** Mesma normalizacao do backend: minusculas, sem acento, sem pontuacao. */
function normalizar(texto: string): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function QueueScreen({ fila, conectado, onAssumir }: Props) {
  const [busca, setBusca] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState<NivelPrioridade | 'TODAS'>('TODAS');
  const [soReincidentes, setSoReincidentes] = useState(false);

  const filtrada = useMemo(() => {
    // Todos os termos precisam aparecer: busca por "lucas fatura" exige os dois.
    const termos = normalizar(busca).split(' ').filter(Boolean);

    return fila.filter((c) => {
      if (nivelFiltro !== 'TODAS' && c.prioridade?.nivel !== nivelFiltro) return false;
      if (soReincidentes && !c.cliente.reincidente) return false;
      if (!termos.length) return true;
      const alvo = c.indiceBusca ?? '';
      return termos.every((t) => alvo.includes(t));
    });
  }, [fila, busca, nivelFiltro, soReincidentes]);

  const criticas = fila.filter((c) => c.prioridade?.nivel === 'CRITICA').length;
  const filtrando = busca.trim() !== '' || nivelFiltro !== 'TODAS' || soReincidentes;

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-ink-900">Fila de chamados</h1>
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              Ordenada por urgência: sentimento, reincidência e tempo de espera.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {criticas > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-[12px] font-semibold text-rose-800">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" aria-hidden />
                {criticas} crítica{criticas > 1 ? 's' : ''}
              </span>
            )}
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink-700 shadow-card">
              {fila.length} na fila
            </span>
          </div>
        </div>

        {/* Busca e filtros */}
        <div className="mb-4 rounded-xl bg-white p-3 shadow-card">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF, protocolo, assunto ou qualquer palavra da conversa..."
            aria-label="Buscar na fila"
            className="w-full rounded-lg border border-hair px-3 py-2 text-[13px] outline-none transition focus:border-claro-red focus:ring-2 focus:ring-claro-rose"
          />

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-ink-400">Prioridade:</span>
            <BotaoFiltro ativo={nivelFiltro === 'TODAS'} onClick={() => setNivelFiltro('TODAS')}>
              Todas
            </BotaoFiltro>
            {NIVEIS.map((n) => (
              <BotaoFiltro key={n} ativo={nivelFiltro === n} onClick={() => setNivelFiltro(n)}>
                {ESTILO_PRIORIDADE[n].rotulo}
              </BotaoFiltro>
            ))}
            <BotaoFiltro ativo={soReincidentes} onClick={() => setSoReincidentes((v) => !v)}>
              Só reincidentes
            </BotaoFiltro>

            {filtrando && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setNivelFiltro('TODAS');
                  setSoReincidentes(false);
                }}
                className="ml-auto text-[11.5px] font-medium text-claro-red hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {filtrando && (
            <p className="mt-2 text-[11.5px] text-ink-500">
              Mostrando {filtrada.length} de {fila.length} chamado{fila.length === 1 ? '' : 's'}.
            </p>
          )}
        </div>

        {!conectado && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
            WebSocket desconectado. Verifique se o orquestrador está rodando em
            <span className="font-mono"> http://localhost:3000</span>.
          </div>
        )}

        {fila.length === 0 ? (
          <VazioSemFila />
        ) : filtrada.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hair bg-white/60 px-6 py-10 text-center">
            <p className="text-[13.5px] font-medium text-ink-700">Nenhum chamado bate com o filtro</p>
            <p className="mt-1 text-[12.5px] text-ink-500">Ajuste a busca ou limpe os filtros.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtrada.map((card) => (
              <CardFila key={card.protocolo} card={card} onAssumir={onAssumir} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BotaoFiltro({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-md border px-2 py-1 text-[11.5px] font-medium transition ${
        ativo
          ? 'border-claro-red bg-claro-rose text-claro-dark'
          : 'border-hair bg-white text-ink-500 hover:border-ink-400'
      }`}
    >
      {children}
    </button>
  );
}

function CardFila({ card, onAssumir }: { card: HandoffCard; onAssumir: (c: HandoffCard) => void }) {
  const nivel = card.prioridade?.nivel ?? 'BAIXA';
  const estilo = ESTILO_PRIORIDADE[nivel];
  const critico = nivel === 'CRITICA';

  return (
    <li className={`flex overflow-hidden rounded-xl bg-white shadow-card ${critico ? 'ring-1 ring-rose-300' : ''}`}>
      {/* Barra lateral de urgencia — reforco visual, nunca o unico sinal */}
      <div className={`w-1 shrink-0 ${estilo.barra}`} aria-hidden />

      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-claro-rose text-claro-red">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[14px] font-semibold text-ink-900">{card.cliente.nome}</p>
                <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${estilo.chip}`}>
                  {critico && <span className="h-1 w-1 animate-pulse rounded-full bg-rose-600" aria-hidden />}
                  {estilo.rotulo.toUpperCase()}
                </span>
                {card.cliente.reincidente && (
                  <span className="rounded border border-hair bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-ink-700">
                    Reincidente · {card.cliente.totalProtocolos}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-500">
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

        {/* Por que este card esta nesse nivel — em texto, nao so na cor */}
        {card.prioridade?.motivos?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {card.prioridade.motivos.map((m) => (
              <span key={m} className="rounded bg-canvas px-1.5 py-0.5 text-[10.5px] text-ink-700">
                {m}
              </span>
            ))}
          </div>
        )}

        <p className="mt-2.5 line-clamp-3 rounded-lg border border-hair bg-canvas/60 p-3 text-[12.5px] leading-relaxed text-ink-700">
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
      </div>
    </li>
  );
}

function VazioSemFila() {
  return (
    <div className="rounded-xl border border-dashed border-hair bg-white/60 px-6 py-14 text-center">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-canvas text-ink-400">
        <BoltIcon className="h-4 w-4" />
      </div>
      <p className="text-[13.5px] font-medium text-ink-700">Nenhum chamado na fila</p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-ink-500">
        Abra o chat do cliente em <span className="font-mono">http://localhost:5174</span> e peça para falar com um
        atendente. O card aparece aqui em tempo real, via WebSocket.
      </p>
    </div>
  );
}
