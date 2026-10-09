import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('/', { transports: ['websocket', 'polling'] });

type Remetente = 'CLIENTE' | 'BOT' | 'ATENDENTE';

interface Bolha {
  remetente: Remetente;
  texto: string;
  hora: string;
  operador?: string;
}

interface Etapa {
  chave: string;
  rotulo: string;
  estado: 'EXECUTANDO' | 'CONCLUIDO';
}

type Canal = 'WHATSAPP' | 'APP_MINHA_CLARO' | 'PORTAL_WEB';

const CENARIOS = [
  'Meu Wi-Fi esta caindo toda hora, e queria saber se tem pacote com HBO',
  'Boa tarde, minha internet esta muito lenta desde ontem',
  'Quero falar com um atendente',
];

const agora = () =>
  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function App() {
  const [canal, setCanal] = useState<Canal>('WHATSAPP');
  const [bolhas, setBolhas] = useState<Bolha[]>([]);
  const [rascunho, setRascunho] = useState('');
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [digitando, setDigitando] = useState(false);
  const [emAtendimento, setEmAtendimento] = useState(false);
  /** Protocolo aguardando nota; null quando nao ha pesquisa aberta. */
  const [protocoloAvaliar, setProtocoloAvaliar] = useState<string | null>(null);
  const [notaEnviada, setNotaEnviada] = useState<number | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  /** Gerado uma vez por aba: permite receber progresso antes de existir sessao. */
  const correlacaoId = useRef(Math.random().toString(36).slice(2) + Date.now().toString(36));
  const fim = useRef<HTMLDivElement>(null);

  // Entra na sala de correlacao assim que a aba abre.
  useEffect(() => {
    const entrar = () => socket.emit('customer:joinCorrelacao', { correlacaoId: correlacaoId.current });
    entrar();
    socket.on('connect', entrar);

    function onProgresso(p: { chave: string; rotulo: string; estado: 'EXECUTANDO' | 'CONCLUIDO' }) {
      setEtapas((atuais) => {
        const existente = atuais.find((e) => e.chave === p.chave);
        if (existente) return atuais.map((e) => (e.chave === p.chave ? { ...e, ...p } : e));
        return [...atuais, { chave: p.chave, rotulo: p.rotulo, estado: p.estado }];
      });
      // Feedback tatil em celular: avisa que algo andou sem exigir leitura.
      if (p.estado === 'CONCLUIDO' && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    }

    socket.on('progress:update', onProgresso);
    return () => {
      socket.off('connect', entrar);
      socket.off('progress:update', onProgresso);
    };
  }, []);

  async function avaliar(nota: number) {
    if (!protocoloAvaliar) return;
    setNotaEnviada(nota);
    try {
      const r = await fetch(`/api/v1/handoff/queue/${protocoloAvaliar}/csat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota }),
      });
      const j = await r.json();
      setBolhas((b) => [
        ...b,
        {
          remetente: 'BOT',
          texto: j?.ok
            ? 'Obrigado pela avaliacao! Ela ajuda a gente a melhorar o atendimento.'
            : (j?.motivo ?? 'Nao consegui registrar sua avaliacao.'),
          hora: agora(),
        },
      ]);
    } catch {
      setNotaEnviada(null);
      setBolhas((b) => [
        ...b,
        { remetente: 'BOT', texto: 'Nao consegui registrar sua avaliacao agora.', hora: agora() },
      ]);
    }
  }

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bolhas.length, digitando]);

  // Entra na sala da sessao para receber as mensagens do atendente humano.
  useEffect(() => {
    if (!sessionId) return;
    socket.emit('customer:join', { sessionId });

    function onMensagem(m: { sessionId: string; remetente: Remetente; texto: string; operador?: string }) {
      if (m.sessionId !== sessionId || m.remetente !== 'ATENDENTE') return;
      setBolhas((b) => [...b, { remetente: 'ATENDENTE', texto: m.texto, hora: agora(), operador: m.operador }]);
      setDigitando(false);
      // Quem entra na sala depois do agent:accept nao recebeu o session:status.
      // A propria mensagem do atendente ja prova que o humano assumiu.
      setEmAtendimento(true);
    }

    function onStatus(s: { sessionId: string; status: string; operador?: string; protocolo?: string }) {
      if (s.sessionId !== sessionId) return;
      setEmAtendimento(s.status === 'EM_ATENDIMENTO');
      if (s.status === 'ENCERRADA') {
        setEmAtendimento(false);
        setQuickReplies([]);
        // O atendente encerrou: abre a pesquisa de satisfacao do protocolo.
        if (s.protocolo) {
          setProtocoloAvaliar(s.protocolo);
          setBolhas((b) => [
            ...b,
            {
              remetente: 'BOT',
              texto: `Atendimento encerrado${s.operador ? ` por ${s.operador}` : ''}. Protocolo ${s.protocolo}.`,
              hora: agora(),
            },
          ]);
        }
      }
    }

    socket.on('message:new', onMensagem);
    socket.on('session:status', onStatus);
    return () => {
      socket.off('message:new', onMensagem);
      socket.off('session:status', onStatus);
    };
  }, [sessionId]);

  async function enviar(texto: string) {
    const conteudo = texto.trim();
    if (!conteudo) return;

    setBolhas((b) => [...b, { remetente: 'CLIENTE', texto: conteudo, hora: agora() }]);
    setRascunho('');
    setQuickReplies([]);
    setEtapas([]);
    setDigitando(true);

    try {
      const r = await fetch('/api/v1/webhooks/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conteudo, canal, telefone: '+5511992314872', correlacaoId: correlacaoId.current }),
      });
      const data = await r.json();

      setSessionId(data.sessionId);
      if (data.modo === 'TRANSBORDO') setEmAtendimento(false);

      if (data.resposta) {
        setBolhas((b) => [...b, { remetente: 'BOT', texto: data.resposta, hora: agora() }]);
      }
      setQuickReplies(data.quickReplies ?? []);
    } catch {
      setBolhas((b) => [
        ...b,
        { remetente: 'BOT', texto: 'Nao consegui falar com o orquestrador. Ele esta rodando em localhost:3000?', hora: agora() },
      ]);
    } finally {
      setDigitando(false);
      setEtapas([]);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([12, 40, 12]);
    }
  }

  function reiniciar() {
    setBolhas([]);
    setQuickReplies([]);
    setSessionId(null);
    setEmAtendimento(false);
    setEtapas([]);
    setProtocoloAvaliar(null);
    setNotaEnviada(null);
  }

  return (
    <div className="mx-auto flex h-full max-w-[440px] flex-col bg-white shadow-xl">
      {/* Cabecalho do canal */}
      <header className="shrink-0 bg-claro-red px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-[13px] font-bold">
              {emAtendimento ? 'MC' : 'C'}
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold">
                {emAtendimento ? 'Mariana Costa - Claro' : 'Claro - Atendimento'}
              </div>
              <div className="text-[11px] text-white/80">
                {emAtendimento ? 'atendente humano - online' : 'assistente virtual - online'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-medium transition hover:bg-white/25"
          >
            Reiniciar
          </button>
        </div>

        <div className="mt-2.5 flex gap-1">
          {(['WHATSAPP', 'APP_MINHA_CLARO', 'PORTAL_WEB'] as Canal[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCanal(c)}
              className={`rounded px-2 py-1 text-[10px] font-medium transition ${
                canal === c ? 'bg-white text-claro-red' : 'bg-white/15 text-white/85 hover:bg-white/25'
              }`}
            >
              {c === 'WHATSAPP' ? 'WhatsApp' : c === 'APP_MINHA_CLARO' ? 'App Minha Claro' : 'Portal Web'}
            </button>
          ))}
        </div>
      </header>

      {/* Conversa */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#ECE5DD] px-3 py-4">
        {bolhas.length === 0 && (
          <div className="rounded-xl bg-white/80 p-4 text-center">
            <p className="text-[12.5px] font-medium text-ink-700">Escolha um cenario para comecar</p>
            <div className="mt-3 space-y-2">
              {CENARIOS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => enviar(c)}
                  className="block w-full rounded-lg border border-hair bg-white px-3 py-2 text-left text-[12px] text-ink-700 transition hover:border-claro-red hover:text-claro-red"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {bolhas.map((b, i) => (
          <Bolha key={i} bolha={b} />
        ))}

        {digitando && (
          <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm" style={{ width: 'fit-content', maxWidth: '86%' }}>
            {etapas.length === 0 ? (
              <div className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            ) : (
              /* Consulta a sistema legado leva segundos: dizer o que esta
                 acontecendo evita a impressao de que o bot travou. */
              <ul className="space-y-1.5">
                {etapas.map((e) => (
                  <li key={e.chave} className="flex items-center gap-2 text-[11.5px]">
                    {e.estado === 'CONCLUIDO' ? (
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">
                        &#10003;
                      </span>
                    ) : (
                      <span
                        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-claro-rose border-t-claro-red"
                        aria-hidden
                      />
                    )}
                    <span className={e.estado === 'CONCLUIDO' ? 'text-ink-400 line-through' : 'text-ink-700'}>
                      {e.rotulo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div ref={fim} />
      </div>

      {/* Pesquisa de satisfacao, aberta quando o atendente encerra */}
      {protocoloAvaliar && (
        <div className="shrink-0 border-t border-hair bg-white px-3 py-3">
          <p className="text-center text-[12px] font-medium text-ink-900">
            Como foi seu atendimento?
          </p>
          <p className="mt-0.5 text-center text-[10.5px] text-ink-400">
            Protocolo {protocoloAvaliar}
          </p>
          <div className="mt-2.5 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => avaliar(n)}
                disabled={notaEnviada !== null}
                aria-label={`Nota ${n} de 5`}
                className={`grid h-10 w-10 place-items-center rounded-full border text-[14px] font-bold transition ${
                  notaEnviada === n
                    ? 'border-claro-red bg-claro-red text-white'
                    : notaEnviada !== null
                      ? 'border-hair bg-canvas text-ink-400'
                      : 'border-hair bg-white text-ink-700 hover:border-claro-red hover:text-claro-red'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-ink-400">
            {notaEnviada !== null ? 'Avaliacao registrada. Obrigado!' : '1 = muito ruim · 5 = muito bom'}
          </p>
        </div>
      )}

      {/* Quick replies */}
      {!protocoloAvaliar && quickReplies.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto bg-[#ECE5DD] px-3 pb-2">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => enviar(q)}
              className="shrink-0 whitespace-nowrap rounded-full border border-claro-red bg-white px-3 py-1.5 text-[11.5px] font-medium text-claro-red transition hover:bg-claro-rose"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Composicao */}
      <div className="flex shrink-0 items-end gap-2 border-t border-hair bg-white px-3 py-2.5">
        <textarea
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar(rascunho);
            }
          }}
          rows={1}
          placeholder="Mensagem"
          className="max-h-24 flex-1 resize-none rounded-2xl border border-hair px-3.5 py-2.5 text-[13px] outline-none focus:border-claro-red"
        />
        <button
          type="button"
          onClick={() => enviar(rascunho)}
          disabled={!rascunho.trim()}
          aria-label="Enviar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-claro-red text-white transition enabled:hover:bg-claro-dark disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M3.3 20.4 21 12 3.3 3.6 3.3 10l11 2-11 2z" />
          </svg>
        </button>
      </div>

      {sessionId && (
        <div className="shrink-0 border-t border-hair bg-canvas px-3 py-1.5 text-center font-mono text-[10px] text-ink-400">
          sessao {sessionId.slice(0, 8)} &middot; canal {canal}
        </div>
      )}
    </div>
  );
}

function Bolha({ bolha }: { bolha: Bolha }) {
  const doCliente = bolha.remetente === 'CLIENTE';

  return (
    <div className={`flex ${doCliente ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
          doCliente ? 'rounded-tr-sm bg-[#DCF8C6] text-ink-900' : 'rounded-tl-sm bg-white text-ink-900'
        }`}
      >
        {!doCliente && (
          <div className={`mb-0.5 text-[10px] font-semibold ${bolha.remetente === 'BOT' ? 'text-ink-400' : 'text-claro-red'}`}>
            {bolha.remetente === 'BOT' ? 'Assistente OmniClaro' : (bolha.operador ?? 'Atendente')}
          </div>
        )}
        {bolha.texto}
        <div className="mt-0.5 text-right text-[9.5px] text-ink-400">{bolha.hora}</div>
      </div>
    </div>
  );
}
