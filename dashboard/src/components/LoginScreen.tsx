import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { BoltIcon } from './icons';

/** Contas do seed, mostradas por ser um protótipo acadêmico de demonstração. */
const CONTAS_DEMO = [
  { rotulo: 'Operador', email: 'mariana.costa@claro.com.br', senha: 'operador123' },
  { rotulo: 'Supervisor', email: 'supervisor@claro.com.br', senha: 'supervisor123' },
];

export default function LoginScreen() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Nao foi possivel entrar.');
    } finally {
      setEnviando(false);
    }
  }

  function preencher(conta: (typeof CONTAS_DEMO)[number]) {
    setEmail(conta.email);
    setSenha(conta.senha);
    setErro(null);
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-claro-red text-white">
            <BoltIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-tight text-ink-900">OmniDashboard</div>
            <div className="text-[11.5px] text-ink-500">Central de atendimento Claro</div>
          </div>
        </div>

        <form onSubmit={submeter} className="rounded-xl bg-white p-6 shadow-card">
          <h1 className="text-[15px] font-semibold text-ink-900">Entrar</h1>
          <p className="mt-1 text-[12.5px] text-ink-500">Use suas credenciais corporativas.</p>

          <label className="mt-5 block">
            <span className="text-[12px] font-medium text-ink-700">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="nome.sobrenome@claro.com.br"
              className="mt-1.5 w-full rounded-lg border border-hair px-3 py-2.5 text-[13px] outline-none transition focus:border-claro-red focus:ring-2 focus:ring-claro-rose"
            />
          </label>

          <label className="mt-3.5 block">
            <span className="text-[12px] font-medium text-ink-700">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-lg border border-hair px-3 py-2.5 text-[13px] outline-none transition focus:border-claro-red focus:ring-2 focus:ring-claro-rose"
            />
          </label>

          {erro && (
            <p role="alert" className="mt-3.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-5 w-full rounded-lg bg-claro-red py-2.5 text-[13px] font-semibold text-white transition enabled:hover:bg-claro-dark disabled:opacity-60"
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-dashed border-hair bg-white/60 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Contas de demonstração</p>
          <div className="mt-2 space-y-1.5">
            {CONTAS_DEMO.map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => preencher(c)}
                className="flex w-full items-center justify-between rounded-lg border border-hair bg-white px-3 py-2 text-left transition hover:border-claro-roseline hover:bg-claro-rose"
              >
                <span>
                  <span className="block text-[12px] font-medium text-ink-900">{c.rotulo}</span>
                  <span className="block font-mono text-[10.5px] text-ink-400">{c.email}</span>
                </span>
                <span className="text-[10.5px] text-claro-red">preencher</span>
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[10.5px] leading-snug text-ink-400">
            Protótipo acadêmico: autenticação por JWT com papéis, sem OAuth corporativo nem MFA.
          </p>
        </div>
      </div>
    </div>
  );
}
