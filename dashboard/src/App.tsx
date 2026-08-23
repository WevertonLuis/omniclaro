import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AiContextPanel from './components/AiContextPanel';
import CallBar from './components/CallBar';
import ChatColumn from './components/ChatColumn';
import QueueScreen from './components/QueueScreen';
import TopBar from './components/TopBar';
import { buscarFila } from './lib/api';
import { nomeCurto } from './lib/mask';
import { socket } from './lib/socket';
import type { HandoffCard, TurnoConversa } from './lib/types';

const OPERADOR = 'Mariana Costa';

const RESPOSTAS_RAPIDAS = [
  'Aguarde um momento, estou verificando.',
  'Posso confirmar outro dado para validacao?',
  'Vou abrir um protocolo para acompanhamento.',
  'Acesso normalizado, pode testar agora?',
];

export default function App() {
  const [conectado, setConectado] = useState(socket.connected);
  const [fila, setFila] = useState<HandoffCard[]>([]);
  const [ativo, setAtivo] = useState<HandoffCard | null>(null);
  const [mensagens, setMensagens] = useState<TurnoConversa[]>([]);
  const [digitando, setDigitando] = useState(false);

  /** Espelho do atendimento ativo, legivel de dentro dos handlers do socket. */
  const ativoRef = useRef<HandoffCard | null>(null);
  useEffect(() => {
    ativoRef.current = ativo;
  }, [ativo]);

  // ------------------------- Ciclo de vida do socket -------------------------

  useEffect(() => {
    function onConnect() {
      setConectado(true);
      socket.emit('dashboard:join');
    }
    function onDisconnect() {
      setConectado(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    buscarFila().then(setFila).catch(() => undefined);
  }, []);

  useEffect(() => {
    function onQueue(novaFila: HandoffCard[]) {
      setFila(novaFila);
      // Mantem o card ativo sincronizado com o estado do servidor.
      setAtivo((atual) => (atual ? (novaFila.find((c) => c.protocolo === atual.protocolo) ?? atual) : atual));
    }

    function onHandoff(card: HandoffCard) {
      setFila((f) => [...f.filter((c) => c.protocolo !== card.protocolo), card]);
    }

    function onMensagem(m: TurnoConversa & { sessionId: string }) {
      // A sessao ativa vem de um ref, nao de dentro de um updater de estado:
      // o React invoca updaters duas vezes em modo estrito, e disparar
      // setMensagens la dentro duplicava cada mensagem recebida.
      const atual = ativoRef.current;
      if (!atual || m.sessionId !== atual.sessionId) return;
      setMensagens((lista) => [...lista, m]);
      setDigitando(false);
    }

    socket.on('queue:update', onQueue);
    socket.on('handoff:new', onHandoff);
    socket.on('message:new', onMensagem);

    return () => {
      socket.off('queue:update', onQueue);
      socket.off('handoff:new', onHandoff);
      socket.off('message:new', onMensagem);
    };
  }, []);

  // ------------------------------- Acoes -------------------------------

  const assumir = useCallback((card: HandoffCard) => {
    socket.emit('agent:accept', { protocolo: card.protocolo, operador: OPERADOR }, (atualizado: HandoffCard) => {
      const alvo = atualizado ?? card;
      setAtivo(alvo);
      setMensagens(alvo.conversa ?? []);
    });
  }, []);

  const enviar = useCallback(
    (texto: string) => {
      if (!ativo) return;
      socket.emit('agent:message', { sessionId: ativo.sessionId, texto, operador: OPERADOR });
      setDigitando(true);
      setTimeout(() => setDigitando(false), 4000);
    },
    [ativo],
  );

  const encerrar = useCallback(() => {
    if (!ativo) return;
    socket.emit('agent:close', { sessionId: ativo.sessionId, protocolo: ativo.protocolo });
    setAtivo(null);
    setMensagens([]);
  }, [ativo]);

  const nomeCliente = useMemo(() => (ativo ? nomeCurto(ativo.cliente.nome) : ''), [ativo]);

  // ------------------------------- Render -------------------------------

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TopBar operador={OPERADOR} conectado={conectado} />

      {!ativo ? (
        <QueueScreen fila={fila} conectado={conectado} onAssumir={assumir} />
      ) : (
        <>
          <CallBar card={ativo} onEncerrar={encerrar} />
          <div className="flex min-h-0 flex-1">
            <ChatColumn
              operador={OPERADOR}
              nomeCliente={nomeCliente}
              mensagens={mensagens}
              digitando={digitando}
              respostasRapidas={RESPOSTAS_RAPIDAS}
              onEnviar={enviar}
            />
            <AiContextPanel card={ativo} />
          </div>
        </>
      )}

      <button
        type="button"
        title="Ajuda"
        className="fixed bottom-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-[13px] font-bold text-white shadow-lg transition hover:bg-ink-700"
      >
        ?
      </button>
    </div>
  );
}
