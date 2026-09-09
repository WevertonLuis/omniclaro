import { useEffect, useState } from 'react';
import type { Operador } from '../lib/auth';
import { BoltIcon } from './icons';

export type AbaOperador = 'atendimento' | 'painel';

interface Props {
  operador: Operador;
  onSair: () => void;
  /** Presentes só para OPERADOR: o supervisor tem uma tela única. */
  aba?: AbaOperador;
  onTrocarAba?: (aba: AbaOperador) => void;
  /** Badge de chamados aguardando, exibido na aba de atendimento. */
  naFila?: number;
}

export default function TopBar({ operador, onSair, aba, onTrocarAba, naFila = 0 }: Props) {
  const [hora, setHora] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000 * 20);
    return () => clearInterval(t);
  }, []);

  const relogio = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
  const iniciais = operador.nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  const supervisor = operador.papel === 'SUPERVISOR';

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-hair bg-white px-4">
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-claro-red text-white">
          <BoltIcon className="h-4 w-4" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-ink-900">OmniDashboard</span>
        <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">v2.4</span>
        {supervisor && (
          <span className="rounded-md bg-claro-rose px-1.5 py-0.5 text-[10px] font-semibold text-claro-dark">
            Supervisão
          </span>
        )}

        {aba && onTrocarAba && (
          <nav className="ml-3 flex items-center gap-1 border-l border-hair pl-3.5">
            <BotaoAba ativa={aba === 'atendimento'} onClick={() => onTrocarAba('atendimento')}>
              Atendimento
              {naFila > 0 && (
                <span className="ml-1.5 rounded-full bg-claro-red px-1.5 text-[9.5px] font-bold text-white">
                  {naFila}
                </span>
              )}
            </BotaoAba>
            <BotaoAba ativa={aba === 'painel'} onClick={() => onTrocarAba('painel')}>
              Meu painel
            </BotaoAba>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          <span className="text-[12px] text-ink-500">Sistema operacional</span>
        </div>

        <span className="text-[12px] tabular-nums text-ink-500">&#9679; {relogio}</span>

        <div className="flex items-center gap-2.5 border-l border-hair pl-4">
          <div className="text-right leading-tight">
            <div className="text-[12.5px] font-semibold text-ink-900">{operador.nome}</div>
            <div className="text-[10.5px] text-ink-400">
              {supervisor ? 'Supervisor' : 'Atendente'}
              {operador.turno ? ` · ${operador.turno}` : ''}
            </div>
          </div>
          <div className="relative">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-rose-200 to-rose-300 text-[11px] font-bold text-claro-dark">
              {iniciais}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <button
            type="button"
            onClick={onSair}
            className="rounded-md border border-hair px-2.5 py-1.5 text-[11.5px] font-medium text-ink-700 transition hover:border-claro-roseline hover:bg-claro-rose hover:text-claro-dark"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

function BotaoAba({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa ? 'page' : undefined}
      className={`flex items-center rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
        ativa ? 'bg-claro-rose text-claro-dark' : 'text-ink-500 hover:bg-canvas hover:text-ink-900'
      }`}
    >
      {children}
    </button>
  );
}
