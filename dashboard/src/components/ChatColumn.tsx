import { useEffect, useRef, useState } from 'react';
import type { TurnoConversa } from '../lib/types';
import { horaCurta } from '../lib/mask';
import { DocIcon, KebabIcon, SendIcon, UserIcon } from './icons';

interface Props {
  operador: string;
  nomeCliente: string;
  mensagens: TurnoConversa[];
  digitando: boolean;
  respostasRapidas: string[];
  onEnviar: (texto: string) => void;
}

export default function ChatColumn({
  operador,
  nomeCliente,
  mensagens,
  digitando,
  respostasRapidas,
  onEnviar,
}: Props) {
  const [rascunho, setRascunho] = useState('');
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens.length, digitando]);

  function enviar() {
    const texto = rascunho.trim();
    if (!texto) return;
    onEnviar(texto);
    setRascunho('');
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-hair bg-white">
      {/* Cabecalho da coluna */}
      <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-hair px-4">
        <div className="flex items-center gap-2.5">
          <h2 className="label-caps">Conversa ao vivo</h2>
          <span className="rounded-md bg-canvas px-2 py-0.5 text-[10.5px] font-medium text-ink-500">
            Chat + Voz sincronizados
          </span>
        </div>
        <button type="button" className="text-ink-400 transition hover:text-ink-700" aria-label="Mais opcoes">
          <KebabIcon />
        </button>
      </div>

      {/* Trilha de mensagens */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {mensagens.length === 0 && (
          <p className="pt-8 text-center text-[12.5px] text-ink-400">
            Nenhuma mensagem nesta sessao ainda.
          </p>
        )}

        {mensagens.map((m, i) => {
          const doAtendente = m.remetente === 'ATENDENTE' || m.remetente === 'BOT';
          return doAtendente ? (
            <MensagemAtendente
              key={i}
              texto={m.texto}
              hora={horaCurta(m.timestamp)}
              autor={m.remetente === 'BOT' ? 'OmniClaro IA' : (m.operador ?? operador)}
              bot={m.remetente === 'BOT'}
            />
          ) : (
            <MensagemCliente key={i} texto={m.texto} hora={horaCurta(m.timestamp)} autor={nomeCliente} />
          );
        })}

        {digitando && (
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-canvas text-ink-400">
              <UserIcon className="h-3 w-3" />
            </div>
            <div className="flex gap-1 rounded-xl border border-hair bg-white px-3 py-2.5">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={fim} />
      </div>

      {/* Respostas rapidas sugeridas */}
      {respostasRapidas.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-hair px-4 py-2.5">
          {respostasRapidas.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onEnviar(r)}
              className="shrink-0 whitespace-nowrap rounded-md border border-hair bg-white px-2.5 py-1.5 text-[11.5px] text-ink-700 transition hover:border-claro-roseline hover:bg-claro-rose hover:text-claro-dark"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Composicao */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="relative rounded-xl border border-hair bg-white focus-within:border-claro-roseline focus-within:ring-2 focus-within:ring-claro-rose">
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            rows={2}
            placeholder="Digite uma mensagem para o cliente..."
            className="w-full resize-none bg-transparent px-3.5 py-3 pr-24 text-[13px] text-ink-900 outline-none placeholder:text-ink-400"
          />
          <button
            type="button"
            className="absolute bottom-3 right-[58px] text-ink-400 transition hover:text-ink-700"
            aria-label="Anexar documento"
          >
            <DocIcon />
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={!rascunho.trim()}
            aria-label="Enviar mensagem"
            className="absolute bottom-2.5 right-3 grid h-9 w-9 place-items-center rounded-full bg-claro-red text-white transition enabled:hover:bg-claro-dark disabled:bg-claro-roseline disabled:text-white/70"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </section>
  );
}

function MensagemAtendente({
  texto,
  hora,
  autor,
  bot,
}: {
  texto: string;
  hora: string;
  autor: string;
  bot: boolean;
}) {
  return (
    <div className="flex flex-col items-end">
      <div className="mb-1 flex items-center gap-1.5 pr-0.5">
        <span className="text-[10.5px] text-ink-400">{autor}</span>
        <div
          className={`grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold text-white ${
            bot ? 'bg-ink-400' : 'bg-gradient-to-br from-rose-300 to-rose-400'
          }`}
        >
          {bot ? 'IA' : autor.split(' ').map((p) => p[0]).slice(0, 2).join('')}
        </div>
      </div>
      <div className="max-w-[76%] whitespace-pre-wrap rounded-xl rounded-tr-sm bg-claro-bubble px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
        {texto}
      </div>
      <div className="mt-1 flex items-center gap-1 pr-1 text-[10.5px] text-ink-400">
        <span className="tabular-nums">{hora}</span>
        <span aria-label="entregue">&#10003;&#10003;</span>
      </div>
    </div>
  );
}

function MensagemCliente({ texto, hora, autor }: { texto: string; hora: string; autor: string }) {
  return (
    <div className="flex flex-col items-start">
      <div className="mb-1 flex items-center gap-1.5">
        <div className="grid h-5 w-5 place-items-center rounded-full bg-canvas text-ink-400">
          <UserIcon className="h-2.5 w-2.5" />
        </div>
        <span className="text-[10.5px] text-ink-400">{autor}</span>
      </div>
      <div className="max-w-[76%] whitespace-pre-wrap rounded-xl rounded-tl-sm border border-hair bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-900">
        {texto}
      </div>
      <span className="mt-1 pl-1 text-[10.5px] tabular-nums text-ink-400">{hora}</span>
    </div>
  );
}
