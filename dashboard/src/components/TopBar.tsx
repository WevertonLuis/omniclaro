import { useEffect, useState } from 'react';
import { BoltIcon } from './icons';

interface Props {
  operador: string;
  conectado: boolean;
}

export default function TopBar({ operador, conectado }: Props) {
  const [hora, setHora] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000 * 20);
    return () => clearInterval(t);
  }, []);

  const relogio = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
  const iniciais = operador
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-hair bg-white px-4">
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-claro-red text-white">
          <BoltIcon className="h-4 w-4" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-ink-900">OmniDashboard</span>
        <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">v2.4</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${conectado ? 'bg-emerald-500' : 'bg-amber-500'}`}
            aria-hidden
          />
          <span className="text-[12px] text-ink-500">
            {conectado ? 'Sistema operacional' : 'Reconectando...'}
          </span>
        </div>

        <span className="text-[12px] tabular-nums text-ink-500">&#9679; {relogio}</span>

        <div className="flex items-center gap-2.5 border-l border-hair pl-4">
          <div className="text-right leading-tight">
            <div className="text-[12.5px] font-semibold text-ink-900">{operador}</div>
            <div className="text-[10.5px] text-ink-400">Atendente &middot; Turno A</div>
          </div>
          <div className="relative">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-rose-200 to-rose-300 text-[11px] font-bold text-claro-dark">
              {iniciais}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
        </div>
      </div>
    </header>
  );
}
