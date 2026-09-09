import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Papel = 'OPERADOR' | 'SUPERVISOR';

export interface Operador {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  turno: string | null;
}

interface EstadoAuth {
  operador: Operador | null;
  token: string | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
}

const CHAVE = 'omniclaro.token';
const Contexto = createContext<EstadoAuth>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CHAVE);
    } catch {
      return null;
    }
  });
  const [operador, setOperador] = useState<Operador | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Restaura a sessao a partir do token guardado; token expirado limpa sozinho.
  useEffect(() => {
    if (!token) {
      setOperador(null);
      setCarregando(false);
      return;
    }
    let cancelado = false;
    fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('token invalido'))))
      .then((dados) => {
        if (!cancelado) setOperador(dados);
      })
      .catch(() => {
        if (cancelado) return;
        try {
          localStorage.removeItem(CHAVE);
        } catch {
          /* modo privado bloqueia storage; seguir sem persistir */
        }
        setToken(null);
        setOperador(null);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const r = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      throw new Error(corpo?.message ?? 'Nao foi possivel entrar.');
    }

    const dados = await r.json();
    try {
      localStorage.setItem(CHAVE, dados.accessToken);
    } catch {
      /* sem persistencia: a sessao vale so para esta aba */
    }
    setToken(dados.accessToken);
    setOperador(dados.operador);
    setCarregando(false);
  }, []);

  const sair = useCallback(() => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* nada a limpar */
    }
    setToken(null);
    setOperador(null);
  }, []);

  const valor = useMemo(
    () => ({ operador, token, carregando, entrar, sair }),
    [operador, token, carregando, entrar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  return useContext(Contexto);
}

/** fetch com o token do operador ja anexado. */
export async function buscarComToken<T>(url: string, token: string): Promise<T> {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  return r.json();
}
