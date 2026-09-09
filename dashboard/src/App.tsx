import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import AiContextPanel from './components/AiContextPanel';
import CallBar from './components/CallBar';
import ChatColumn from './components/ChatColumn';
import LoginScreen from './components/LoginScreen';
import OperatorDashboard from './components/OperatorDashboard';
import QueueScreen from './components/QueueScreen';
import TopBar, { type AbaOperador } from './components/TopBar';
import { buscarFila } from './lib/api';
import { useAuth } from './lib/auth';
import { nomeCurto } from './lib/mask';
import { socket } from './lib/socket';
import type { HandoffCard, TurnoConversa } from './lib/types';

const RESPOSTAS_RAPIDAS = [
  'Aguarde um momento, estou verificando.',
  'Posso confirmar outro dado para validacao?',
  'Vou abrir um protocolo para acompanhamento.',
  'Acesso normalizado, pode testar agora?',
];

export default function App() {
  const { operador, token, carregando, sair } = useAuth();

  if (carregando) {
    return <div className="grid h-full place-items-center text-[13px] text-ink-400">Carregando sessão...</div>;
  }
  if (!operador || !token) {
    return <LoginScreen />;
  }

  if (operador.papel === 'SUPERVISOR') {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <TopBar operador={operador} onSair={sair} />
        <AdminDashboard />
      </div>
    );
  }

  return <AreaOperador token={token} nomeOperador={operador.nome} operadorLogado={operador} onSair={sair} />;
}

// --------------------------- Área do operador ---------------------------

function AreaOperador({
  token,
  nomeOperador,
  operadorLogado,
  onSair,
}: {
  token: string;
  nomeOperador: string;
  operadorLogado: import('./lib/auth').Operador;
  onSair: () => void;
}) {
  const [aba, setAba] = useState<AbaOperador>('atendimento');
  const [conectado, setConectado] = useState(socket.connected);
  const [fila, setFila] = useState<HandoffCard[]>([]);
  const [ativo, setAtivo] = useState<HandoffCard | null>(null);
  const [mensagens, setMensagens] = useState<TurnoConversa[]>([]);
  const [digitando, setDigitando] = useState(false);

  /** Espelho do atendimento ativo, legível de dentro dos handlers do socket. */
  const ativoRef = useRef<HandoffCard | null>(null);
  useEffect(() => {
    ativoRef.current = ativo;
  }, [ativo]);

  // O token vai no join: o servidor identifica o operador pelo JWT.
  useEffect(() => {
    function onConnect() {
      setConectado(true);
      socket.emit('dashboard:join', { token });
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
  }, [token]);

  useEffect(() => {
    buscarFila(token).then(setFila).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    function onQueue(novaFila: HandoffCard[]) {
      setFila(novaFila);
      setAtivo((atual) => (atual ? (novaFila.find((c) => c.protocolo === atual.protocolo) ?? atual) : atual));
    }

    function onHandoff(card: HandoffCard) {
      setFila((f) => [...f.filter((c) => c.protocolo !== card.protocolo), card]);
    }

    function onMensagem(m: TurnoConversa & { sessionId: string }) {
      // A sessão ativa vem de um ref, não de dentro de um updater de estado:
      // o React invoca updaters duas vezes em modo estrito, e disparar
      // setMensagens lá dentro duplicava cada mensagem recebida.
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

  const assumir = useCallback((card: HandoffCard) => {
    socket.emit('agent:accept', { protocolo: card.protocolo }, (atualizado: HandoffCard) => {
      const alvo = atualizado?.protocolo ? atualizado : card;
      setAtivo(alvo);
      setMensagens(alvo.conversa ?? []);
      setAba('atendimento');
    });
  }, []);

  const enviar = useCallback(
    (texto: string) => {
      if (!ativo) return;
      socket.emit('agent:message', { sessionId: ativo.sessionId, texto });
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
  const aguardando = useMemo(() => fila.filter((c) => c.status === 'NA_FILA').length, [fila]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TopBar
        operador={operadorLogado}
        onSair={onSair}
        aba={aba}
        onTrocarAba={setAba}
        naFila={aguardando}
      />

      {aba === 'painel' ? (
        <OperatorDashboard onIrParaFila={() => setAba('atendimento')} />
      ) : !ativo ? (
        <QueueScreen fila={fila} conectado={conectado} onAssumir={assumir} />
      ) : (
        <>
          <CallBar card={ativo} onEncerrar={encerrar} />
          <div className="flex min-h-0 flex-1">
            <ChatColumn
              operador={nomeOperador}
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
    </div>
  );
}
