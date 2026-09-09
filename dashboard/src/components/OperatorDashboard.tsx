import { useEffect, useState } from 'react';
import { buscarComToken, useAuth } from '../lib/auth';

interface Kpi {
  rotulo: string;
  valor: string;
  detalhe: string;
}

interface Fatia {
  nome: string;
  quantidade: number;
  percentual: number;
}

interface MeuAtendimento {
  protocolo: string;
  status: string;
  entrouEm: string;
  esperaSegundos: number;
  cliente: { nome: string; cpfMascarado: string } | null;
  resumo: string;
  canal: string;
}

interface MeuPainel {
  operador: string;
  kpis: Kpi[];
  intencoesAtendidas: Fatia[];
  meusAtendimentos: MeuAtendimento[];
  geradoEm: string;
}

/** Mesma matiz única do painel do supervisor: as barras medem uma só grandeza. */
const HUE_MAGNITUDE = '#3D5A99';

export default function OperatorDashboard({ onIrParaFila }: { onIrParaFila: () => void }) {
  const { token } = useAuth();
  const [painel, setPainel] = useState<MeuPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let vivo = true;

    async function carregar() {
      try {
        const dados = await buscarComToken<MeuPainel>('/api/v1/me/metrics', token);
        if (vivo) {
          setPainel(dados);
          setErro(null);
        }
      } catch {
        if (vivo) setErro('Nao foi possivel carregar seu painel.');
      }
    }

    carregar();
    const t = setInterval(carregar, 15000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [token]);

  if (erro) return <p className="p-8 text-[13px] text-rose-700">{erro}</p>;
  if (!painel) return <p className="p-8 text-[13px] text-ink-400">Carregando seu painel...</p>;

  const aguardando = Number(painel.kpis.find((k) => k.rotulo === 'Aguardando na fila')?.valor ?? '0');

  return (
    <div className="flex-1 overflow-y-auto bg-canvas px-6 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-ink-900">Meu painel</h1>
            <p className="mt-0.5 text-[12.5px] text-ink-500">Seu desempenho no atendimento — {painel.operador}</p>
          </div>
          <span className="text-[11px] text-ink-400">
            atualizado{' '}
            {new Date(painel.geradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · a cada 15s
          </span>
        </header>

        {aguardando > 0 && (
          <button
            type="button"
            onClick={onIrParaFila}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-claro-roseline bg-claro-rose px-4 py-3 text-left transition hover:bg-claro-rose/70"
          >
            <span className="flex items-center gap-2.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-claro-red" aria-hidden />
              <span className="text-[13px] font-semibold text-claro-dark">
                {aguardando} chamado{aguardando > 1 ? 's' : ''} aguardando atendimento
              </span>
            </span>
            <span className="text-[12px] font-medium text-claro-red">Ir para a fila →</span>
          </button>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {painel.kpis.map((k) => (
            <article key={k.rotulo} className="rounded-xl bg-white p-4 shadow-card">
              <p className="text-[11.5px] text-ink-500">{k.rotulo}</p>
              <p className="mt-1 text-[26px] font-bold leading-none tracking-tight tabular-nums text-ink-900">
                {k.valor}
              </p>
              <p className="mt-1.5 text-[11px] text-ink-400">{k.detalhe}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-xl bg-white p-4 shadow-card">
          <h2 className="text-[13px] font-semibold text-ink-900">O que seus clientes mais pediram</h2>
          <p className="mt-0.5 text-[11.5px] text-ink-500">Intenções classificadas nas sessões que você atendeu</p>

          {painel.intencoesAtendidas.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-ink-400">
              Assuma um chamado para começar a acumular histórico.
            </p>
          ) : (
            <ul className="mt-3.5 space-y-2.5">
              {painel.intencoesAtendidas.map((d) => (
                <li key={d.nome} title={`${d.nome}: ${d.quantidade} (${d.percentual.toFixed(1)}%)`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-mono text-[10.5px] text-ink-700">{d.nome}</span>
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-ink-900">{d.quantidade}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-canvas">
                    <div
                      className="h-1.5 rounded-full transition-[width] duration-500"
                      style={{
                        width: `${(d.quantidade / Math.max(1, painel.intencoesAtendidas[0].quantidade)) * 100}%`,
                        backgroundColor: HUE_MAGNITUDE,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4 rounded-xl bg-white p-4 shadow-card">
          <h2 className="text-[13px] font-semibold text-ink-900">Seus atendimentos</h2>

          {painel.meusAtendimentos.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-ink-400">Você ainda não assumiu nenhum chamado.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {painel.meusAtendimentos.map((a) => (
                <li key={a.protocolo} className="rounded-lg border border-hair p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink-900">{a.cliente?.nome ?? 'Cliente não identificado'}</p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-ink-400">
                        #{a.protocolo} · {a.cliente?.cpfMascarado ?? '—'} · {a.canal}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {a.esperaSegundos > 0 && (
                        <span className="text-[10.5px] text-ink-400">esperou {a.esperaSegundos}s</span>
                      )}
                      {/* Estado sempre com texto: nunca só cor. */}
                      <span className={`rounded border px-1.5 py-0.5 text-[10.5px] ${corStatus(a.status)}`}>
                        {rotuloStatus(a.status)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-500">{a.resumo}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function corStatus(status: string): string {
  if (status === 'ENCERRADO') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'EM_ATENDIMENTO') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-hair bg-canvas text-ink-700';
}

function rotuloStatus(status: string): string {
  const mapa: Record<string, string> = {
    NA_FILA: 'Na fila',
    EM_ATENDIMENTO: 'Em atendimento',
    ENCERRADO: 'Encerrado',
  };
  return mapa[status] ?? status;
}
