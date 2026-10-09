import { useCallback, useEffect, useState } from 'react';
import { buscarComToken, useAuth } from '../lib/auth';

interface Regra {
  id: number;
  termo: string;
  intencaoAlvo: string;
  tipo: 'SINONIMO' | 'BLOQUEIO';
  ativo: boolean;
  criadoPor: string;
  origemProtocolo: string | null;
  acionamentos: number;
  dataCriacao: string;
}

interface Resposta {
  intencoesDisponiveis: string[];
  regras: Regra[];
}

/**
 * Curadoria de NLU: corrige a classificacao sem tocar no codigo.
 * Fica no painel do supervisor porque muda como o sistema interpreta
 * mensagens de cliente — nao e ajuste que cada operador faz sozinho.
 */
export default function PainelCuradoria() {
  const { token } = useAuth();
  const [dados, setDados] = useState<Resposta | null>(null);
  const [termo, setTermo] = useState('');
  const [intencao, setIntencao] = useState('SUPORTE_TECNICO_INSTABILIDADE');
  const [tipo, setTipo] = useState<'SINONIMO' | 'BLOQUEIO'>('SINONIMO');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!token) return;
    try {
      setDados(await buscarComToken<Resposta>('/api/v1/admin/curadoria', token));
      setErro(null);
    } catch {
      setErro('Nao foi possivel carregar as regras.');
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !termo.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch('/api/v1/admin/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ termo, intencaoAlvo: intencao, tipo }),
      });
      if (!r.ok) {
        const corpo = await r.json().catch(() => ({}));
        throw new Error(Array.isArray(corpo?.message) ? corpo.message.join('; ') : (corpo?.message ?? 'Falhou'));
      }
      setTermo('');
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Nao consegui criar a regra.');
    } finally {
      setSalvando(false);
    }
  }

  async function acao(id: number, metodo: 'PATCH' | 'DELETE') {
    if (!token) return;
    const url = metodo === 'PATCH' ? `/api/v1/admin/curadoria/${id}/alternar` : `/api/v1/admin/curadoria/${id}`;
    await fetch(url, { method: metodo, headers: { Authorization: `Bearer ${token}` } });
    await carregar();
  }

  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold text-ink-900">Curadoria de NLU</h2>
        <span className="text-[11px] text-ink-400">{dados?.regras.length ?? 0} regra(s)</span>
      </div>
      <p className="mt-0.5 text-[11.5px] text-ink-500">
        Ajusta a interpretação do modelo sem alterar código nem reimplantar. Vale na próxima mensagem.
      </p>

      <form onSubmit={criar} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-hair bg-canvas/50 p-3">
        <label className="min-w-[180px] flex-1">
          <span className="text-[11px] font-medium text-ink-700">Termo que o cliente escreve</span>
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="ex.: ta mudo"
            className="mt-1 w-full rounded-md border border-hair px-2.5 py-1.5 text-[12.5px] outline-none focus:border-claro-red"
          />
        </label>

        <label>
          <span className="text-[11px] font-medium text-ink-700">Regra</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'SINONIMO' | 'BLOQUEIO')}
            className="mt-1 block rounded-md border border-hair px-2.5 py-1.5 text-[12.5px] outline-none focus:border-claro-red"
          >
            <option value="SINONIMO">passa a indicar</option>
            <option value="BLOQUEIO">nunca indica</option>
          </select>
        </label>

        <label className="min-w-[220px] flex-1">
          <span className="text-[11px] font-medium text-ink-700">Intenção</span>
          <select
            value={intencao}
            onChange={(e) => setIntencao(e.target.value)}
            className="mt-1 w-full rounded-md border border-hair px-2.5 py-1.5 font-mono text-[11.5px] outline-none focus:border-claro-red"
          >
            {(dados?.intencoesDisponiveis ?? []).map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={salvando || !termo.trim()}
          className="rounded-md bg-claro-red px-3.5 py-2 text-[12.5px] font-semibold text-white transition enabled:hover:bg-claro-dark disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Adicionar'}
        </button>
      </form>

      {erro && (
        <p role="alert" className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {erro}
        </p>
      )}

      {dados?.regras.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-ink-400">
          Nenhuma regra ainda. Crie uma acima para corrigir um falso positivo.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-hair text-[10.5px] uppercase tracking-wide text-ink-500">
                <th className="pb-2 font-semibold">Termo</th>
                <th className="pb-2 font-semibold">Regra</th>
                <th className="pb-2 font-semibold">Intenção</th>
                <th className="pb-2 text-right font-semibold">Acionou</th>
                <th className="pb-2 text-right font-semibold">Situação</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {dados?.regras.map((r) => (
                <tr key={r.id} className="border-b border-hair last:border-0">
                  <td className="py-2 font-mono text-[12px] text-ink-900">{r.termo}</td>
                  <td className="py-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10.5px] ${
                        r.tipo === 'SINONIMO'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}
                    >
                      {r.tipo === 'SINONIMO' ? 'passa a indicar' : 'nunca indica'}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-[11px] text-ink-700">{r.intencaoAlvo}</td>
                  <td className="py-2 text-right text-[12px] tabular-nums text-ink-900">{r.acionamentos}</td>
                  <td className="py-2 text-right">
                    <span className={`text-[11.5px] ${r.ativo ? 'text-emerald-700' : 'text-ink-400'}`}>
                      {r.ativo ? 'Ativa' : 'Desativada'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => acao(r.id, 'PATCH')}
                      className="mr-2 text-[11.5px] font-medium text-ink-700 hover:underline"
                    >
                      {r.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => acao(r.id, 'DELETE')}
                      className="text-[11.5px] font-medium text-claro-red hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
