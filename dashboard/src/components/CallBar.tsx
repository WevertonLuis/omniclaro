import { useEffect, useState } from 'react';
import type { HandoffCard } from '../lib/types';
import { duracao, nomeCurto } from '../lib/mask';
import { EndIcon, MicIcon, TransferIcon, UserIcon } from './icons';

interface Props {
  card: HandoffCard;
  onEncerrar: () => void;
}

export default function CallBar({ card, onEncerrar }: Props) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [card.protocolo]);

  return (
    <div className="flex h-[46px] shrink-0 items-center justify-between border-b border-claro-roseline bg-claro-rose px-4">
      <div className="flex items-center gap-3">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-white text-claro-red ring-1 ring-claro-roseline">
          <UserIcon className="h-3.5 w-3.5" />
        </div>

        <div className="leading-tight">
          <div className="text-[13px] font-bold text-ink-900">{nomeCurto(card.cliente.nome)}</div>
          <div className="text-[11px] text-ink-500">{card.cliente.telefoneFormatado}</div>
        </div>

        <div className="ml-3 flex items-center gap-1.5 border-l border-claro-roseline pl-4">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-claro-red" aria-hidden />
          <span className="text-[12px] font-medium text-claro-dark">Em chamada</span>
          <span className="ml-1 text-[12px] font-bold tabular-nums text-ink-900">{duracao(segundos)}</span>
        </div>

        <div className="ml-1 border-l border-claro-roseline pl-4 text-[12px] text-ink-500">
          Protocolo #{card.protocolo}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-hair bg-white px-3 py-1.5 text-[12px] font-medium text-ink-700 transition hover:bg-canvas"
        >
          <MicIcon />
          Microfone
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-hair bg-white px-3 py-1.5 text-[12px] font-medium text-ink-700 transition hover:bg-canvas"
        >
          <TransferIcon />
          Transferir
        </button>
        <button
          type="button"
          onClick={onEncerrar}
          className="flex items-center gap-1.5 rounded-md bg-claro-red px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-claro-dark"
        >
          <EndIcon />
          Encerrar
        </button>
      </div>
    </div>
  );
}
