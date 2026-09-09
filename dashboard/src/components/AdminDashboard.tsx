import { useEffect, useState } from 'react';
import { buscarComToken, useAuth } from '../lib/auth';
import { BoltIcon } from './icons';

interface Kpi {
  rotulo: string;
  valor: string;
  detalhe: string;
  meta?: string;
  atingiuMeta?: boolean;
}

interface Fatia {
  nome: string;
  quantidade: number;
  percentual: number;
}

interface Metricas {
  kpis: Kpi[];
  volumetria: Record<string, number>;
  intencoesFrequentes: Fatia[];
  statusProtocolos: Fatia[];
  canais: Fatia[];
  geradoEm: string;
}

interface SessaoResumo {
  id: string;
  canal: string;
  status: string;
  iniciadaEm: string;
  totalMensagens: number;
  cliente: { nome: string; cpfMascarado: string; plano: string } | null;
}

interface OperadorResumo {
  id: number;
  nome: string;
  email: string;
  papel: string;
  turno: string;
  ativo: boolean;
  atendimentos: number;
  emAndamento: number;
  esperaMediaSegundos: number;
}

/**
 * Hue unica para magnitude: as barras medem uma so grandeza (frequencia), entao
 * cor aqui nao carrega identidade. Usar varias cores seria decorativo e criaria
 * um problema de daltonismo sem necessidade.
 */
const HUE_MAGNITUDE = '#3D5A99';

export default function AdminDashboard() {
  const { token, operador } = useAuth();
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [sessoes, setSessoes] = useState<SessaoResumo[]>([]);
  const [operadores, setOperadores] = useState<OperadorResumo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let vivo = true;

    async function carregar() {
      try {
        const [m, s, o] = await Promise.all([
          buscarComToken<Metricas>('/api/v1/admin/metrics', token),
          buscarComToken<SessaoResumo[]>('/api/v1/admin/sessions', token),
          buscarComToken<OperadorResumo[]>('/api/v1/admin/operators', token),
        ]);
        if (!vivo) return;
        setMetricas(m);
        setSessoes(s);
        setOperadores(o);
        setErro(null);
      } catch {
        if (vivo) setErro('Nao foi possivel carregar as metricas.');
      }
    }

    carregar();
    const t = setInterval(carregar, 15000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [token]);

  if (erro) {
    return <p className="p-8 text-[13px] text-rose-700">{erro}</p>;
  }
  if (!metricas) {
    return <p className="p-8 text-[13px] text-ink-400">Carregando métricas...</p>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-canvas px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-ink-900">Painel do supervisor</h1>
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              Visão consolidada da operação — {operador?.nome}
            </p>
          </div>
          <span className="text-[11px] text-ink-400">
            atualizado {new Date(metricas.geradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {' · '}a cada 15s
          </span>
        </header>

        {/* KPIs — números-herói, sem gráfico: cada um é um valor único */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {metricas.kpis.map((k) => (
            <article key={k.rotulo} className="rounded-xl bg-white p-4 shadow-card">
              <p className="text-[11.5px] text-ink-500">{k.rotulo}</p>
              <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-ink-900 tabular-nums">
                {k.valor}
              </p>
              <p className="mt-1.5 text-[11px] text-ink-400">{k.detalhe}</p>
              {k.meta && (
                <p
                  className={`mt-2 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] ${
                    k.atingiuMeta
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {/* Texto sempre presente: o estado nunca depende só da cor. */}
                  {k.atingiuMeta ? 'atingiu' : 'abaixo'} · meta {k.meta}
                </p>
              )}
            </article>
          ))}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <GraficoBarras
            titulo="Intenções mais frequentes"
            subtitulo="Classificações do motor de NLU, acumuladas"
            dados={metricas.intencoesFrequentes}
          />
          <GraficoBarras titulo="Canais de origem" subtitulo="Sessões por ponto de contato" dados={metricas.canais} />
        </div>

        <section className="mt-4 rounded-xl bg-white p-4 shadow-card">
          <h2 className="text-[13px] font-semibold text-ink-900">Protocolos por situação</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {metricas.statusProtocolos.map((s) => (
              <span
                key={s.nome}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] ${corStatus(s.nome)}`}
              >
                <strong className="text-[15px] font-bold tabular-nums">{s.quantidade}</strong>
                <span>{rotuloStatus(s.nome)}</span>
                <span className="text-ink-400">{s.percentual.toFixed(0)}%</span>
              </span>
            ))}
          </div>
        </section>

        <TabelaOperadores operadores={operadores} />
        <TabelaSessoes sessoes={sessoes} />
      </div>
    </div>
  );
}

// ------------------------------- Gráfico -------------------------------

function GraficoBarras({ titulo, subtitulo, dados }: { titulo: string; subtitulo: string; dados: Fatia[] }) {
  const maximo = Math.max(1, ...dados.map((d) => d.quantidade));

  return (
    <section className="rounded-xl bg-white p-4 shadow-card">
      <h2 className="text-[13px] font-semibold text-ink-900">{titulo}</h2>
      <p className="mt-0.5 text-[11.5px] text-ink-500">{subtitulo}</p>

      {dados.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-ink-400">Sem dados ainda.</p>
      ) : (
        <ul className="mt-3.5 space-y-2.5">
          {dados.map((d) => (
            <li key={d.nome} title={`${d.nome}: ${d.quantidade} (${d.percentual.toFixed(1)}%)`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-mono text-[10.5px] text-ink-700">{d.nome}</span>
                {/* Rótulo direto: dispensa eixo numérico e legenda. */}
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-ink-900">{d.quantidade}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-canvas">
                <div
                  className="h-1.5 rounded-full transition-[width] duration-500"
                  style={{ width: `${(d.quantidade / maximo) * 100}%`, backgroundColor: HUE_MAGNITUDE }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ------------------------------- Tabelas -------------------------------

function TabelaOperadores({ operadores }: { operadores: OperadorResumo[] }) {
  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-card">
      <h2 className="text-[13px] font-semibold text-ink-900">Operadores</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-hair text-[10.5px] uppercase tracking-wide text-ink-500">
              <th className="pb-2 font-semibold">Nome</th>
              <th className="pb-2 font-semibold">Papel</th>
              <th className="pb-2 font-semibold">Turno</th>
              <th className="pb-2 text-right font-semibold">Atendimentos</th>
              <th className="pb-2 text-right font-semibold">Em andamento</th>
              <th className="pb-2 text-right font-semibold">Espera média</th>
            </tr>
          </thead>
          <tbody>
            {operadores.map((o) => (
              <tr key={o.id} className="border-b border-hair last:border-0">
                <td className="py-2.5 text-[12.5px] text-ink-900">
                  {o.nome}
                  <span className="block font-mono text-[10px] text-ink-400">{o.email}</span>
                </td>
                <td className="py-2.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium ${
                      o.papel === 'SUPERVISOR' ? 'bg-claro-rose text-claro-dark' : 'bg-canvas text-ink-700'
                    }`}
                  >
                    {o.papel}
                  </span>
                </td>
                <td className="py-2.5 text-[12px] text-ink-700">{o.turno}</td>
                <td className="py-2.5 text-right text-[12.5px] tabular-nums text-ink-900">{o.atendimentos}</td>
                <td className="py-2.5 text-right text-[12.5px] tabular-nums text-ink-900">{o.emAndamento}</td>
                <td className="py-2.5 text-right text-[12.5px] tabular-nums text-ink-900">
                  {o.esperaMediaSegundos ? `${o.esperaMediaSegundos}s` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TabelaSessoes({ sessoes }: { sessoes: SessaoResumo[] }) {
  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold text-ink-900">Sessões recentes</h2>
        <span className="text-[11px] text-ink-400">{sessoes.length} listadas</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr className="border-b border-hair text-[10.5px] uppercase tracking-wide text-ink-500">
              <th className="pb-2 font-semibold">Cliente</th>
              <th className="pb-2 font-semibold">CPF</th>
              <th className="pb-2 font-semibold">Canal</th>
              <th className="pb-2 font-semibold">Situação</th>
              <th className="pb-2 text-right font-semibold">Mensagens</th>
              <th className="pb-2 text-right font-semibold">Início</th>
            </tr>
          </thead>
          <tbody>
            {sessoes.map((s) => (
              <tr key={s.id} className="border-b border-hair last:border-0">
                <td className="py-2.5 text-[12.5px] text-ink-900">{s.cliente?.nome ?? '—'}</td>
                {/* Mesmo no painel do supervisor o CPF segue mascarado. */}
                <td className="py-2.5 font-mono text-[11.5px] text-ink-700">{s.cliente?.cpfMascarado ?? '—'}</td>
                <td className="py-2.5 text-[12px] text-ink-700">{s.canal}</td>
                <td className="py-2.5">
                  <span className={`rounded border px-1.5 py-0.5 text-[10.5px] ${corStatus(s.status)}`}>
                    {rotuloStatus(s.status)}
                  </span>
                </td>
                <td className="py-2.5 text-right text-[12.5px] tabular-nums text-ink-900">{s.totalMensagens}</td>
                <td className="py-2.5 text-right text-[11.5px] tabular-nums text-ink-500">
                  {new Date(s.iniciadaEm).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ------------------------------- Status -------------------------------

/**
 * Cores de estado. ABERTO fica neutro de propósito: um protocolo aberto não é
 * um alerta, e usar âmbar aqui deixava o par âmbar/vermelho indistinguível
 * (ΔE 9,1 em visão normal). Todo status vem acompanhado de rótulo textual.
 */
function corStatus(status: string): string {
  switch (status) {
    case 'RESOLVIDO':
    case 'ENCERRADA':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'ESCALADO':
    case 'HANDOFF':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-hair bg-canvas text-ink-700';
  }
}

function rotuloStatus(status: string): string {
  const mapa: Record<string, string> = {
    ABERTO: 'Aberto',
    RESOLVIDO: 'Resolvido',
    ESCALADO: 'Escalado',
    ATIVA: 'Ativa',
    HANDOFF: 'Em transbordo',
    ENCERRADA: 'Encerrada',
  };
  return mapa[status] ?? status;
}
