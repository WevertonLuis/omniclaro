import type { ChipValidado, HandoffCard } from '../lib/types';
import { horaCurta, maskCpf } from '../lib/mask';
import { BoltIcon, ICONES } from './icons';

interface Props {
  card: HandoffCard;
}

const TONS: Record<ChipValidado['tom'], string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  alerta: 'border-amber-200 bg-amber-50 text-amber-700',
  critico: 'border-rose-200 bg-rose-50 text-rose-700',
  neutro: 'border-hair bg-white text-ink-500',
};

export default function AiContextPanel({ card }: Props) {
  return (
    <aside className="flex w-[420px] shrink-0 flex-col overflow-hidden bg-white 2xl:w-[480px]">
      {/* Cabecalho */}
      <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-hair px-4">
        <div className="flex items-center gap-2 text-claro-red">
          <BoltIcon />
          <h2 className="label-caps text-ink-900">AI Context Panel</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          <span className="text-[11px] text-ink-500">Ativo</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <BlocoResumo card={card} />
        <BlocoValidados chips={card.chips} />
        <BlocoPerfil card={card} />
        <BlocoHistorico card={card} />
      </div>
    </aside>
  );
}

// ------------------------------ AI Summary ------------------------------

function BlocoResumo({ card }: Props) {
  return (
    <section className="pt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="label-caps text-ink-700">AI Summary</h3>
        <span className="text-[10.5px] text-ink-400">atualizado {horaCurta(card.ia.atualizadoEm)}</span>
      </div>

      <div className="rounded-lg border border-hair p-3">
        <p className="text-[12.5px] leading-relaxed text-ink-700">{destacar(card.ia.resumo, card.cliente.nome)}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <Sinal rotulo="Sentimento" valor={card.ia.sentimento} tom={tomSentimento(card.ia.sentimento)} />
          <Sinal rotulo="Urgencia" valor={card.ia.urgencia} tom={tomUrgencia(card.ia.urgencia)} />
          <Sinal rotulo="Motor" valor={card.ia.fonte} tom="text-ink-400" />
        </div>

        {card.ia.intencoes.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-hair pt-2.5">
            {card.ia.intencoes.map((i) => (
              <span
                key={i.nome}
                className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink-500"
                title={`Confianca ${(i.confianca * 100).toFixed(0)}%`}
              >
                {i.nome}
                <span className="ml-1 text-ink-400">{(i.confianca * 100).toFixed(0)}%</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-start gap-1.5 border-t border-hair pt-2.5 text-[11.5px] text-ink-500">
          <span className="mt-0.5 text-claro-red">
            <BoltIcon className="h-3 w-3" />
          </span>
          <span>Sugestao de proximo passo: {card.ia.proximoPasso}</span>
        </div>
      </div>
    </section>
  );
}

function Sinal({ rotulo, valor, tom }: { rotulo: string; valor: string; tom: string }) {
  return (
    <span className="text-ink-400">
      {rotulo}: <span className={`font-medium ${tom}`}>{valor.toLowerCase()}</span>
    </span>
  );
}

/** Realca o nome do cliente e os termos de estado dentro do resumo gerado pela IA. */
function destacar(resumo: string, nomeCliente: string) {
  const alvos = [
    { rx: new RegExp(nomeCliente.split(' ').slice(0, 2).join(' '), 'gi'), classe: 'font-semibold text-ink-900' },
    { rx: /\b(offline|instavel|inst[aá]vel|sem sinal|falha|queda[s]?)\b/gi, classe: 'text-rose-600' },
    { rx: /\b(ansioso|frustrado|irritado|impaciente|preocupado)\b/gi, classe: 'text-amber-600' },
    { rx: /\b(online|normalizado|resolvido|validad[oa]s?)\b/gi, classe: 'text-emerald-600' },
  ];

  let partes: (string | JSX.Element)[] = [resumo];
  alvos.forEach(({ rx, classe }, indiceAlvo) => {
    partes = partes.flatMap((parte, indiceParte) => {
      if (typeof parte !== 'string') return [parte];
      const fatias = parte.split(rx);
      const achados = parte.match(rx) ?? [];
      return fatias.flatMap((fatia, i) =>
        i < achados.length
          ? [
              fatia,
              <span key={`${indiceAlvo}-${indiceParte}-${i}`} className={classe}>
                {achados[i]}
              </span>,
            ]
          : [fatia],
      );
    });
  });

  return <>{partes}</>;
}

function tomSentimento(s: string) {
  if (s === 'FRUSTRADO' || s === 'NEGATIVO') return 'text-amber-600';
  if (s === 'POSITIVO') return 'text-emerald-600';
  return 'text-ink-700';
}

function tomUrgencia(u: string) {
  if (u === 'ALTA') return 'text-rose-600';
  if (u === 'BAIXA') return 'text-emerald-600';
  return 'text-ink-700';
}

// ----------------------------- Validated Data -----------------------------

function BlocoValidados({ chips }: { chips: ChipValidado[] }) {
  return (
    <section className="pt-5">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="label-caps text-ink-700">Validated Data</h3>
        <button type="button" className="text-[11px] font-medium text-claro-red hover:underline">
          Ver tudo
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => {
          const Icone = ICONES[c.icone] ?? ICONES.hash;
          return (
            <span
              key={`${c.rotulo}-${c.valor}`}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${TONS[c.tom]}`}
            >
              <Icone className="h-3 w-3" />
              <span>{c.rotulo}:</span>
              <span className="font-mono font-medium">{c.valor}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

// ----------------------------- Perfil do cliente -----------------------------

function BlocoPerfil({ card }: Props) {
  const linhas: { rotulo: string; valor: string; destaque?: boolean }[] = [
    { rotulo: 'Nome completo', valor: card.cliente.nome },
    // Mascaramento LGPD: o painel nunca exibe o CPF integral.
    { rotulo: 'CPF', valor: maskCpf(card.cliente.cpfMascarado), destaque: true },
    { rotulo: 'Plano ativo', valor: card.cliente.planoAtivo },
    { rotulo: 'Endereco', valor: card.cliente.endereco },
    { rotulo: 'Cliente desde', valor: card.cliente.clienteDesde },
    { rotulo: 'Ultima O.S.', valor: card.cliente.ultimaOs },
  ];

  return (
    <section className="pt-5">
      <h3 className="label-caps mb-1 text-ink-700">Perfil do Cliente</h3>
      <dl>
        {linhas.map((l) => (
          <div key={l.rotulo} className="flex items-center justify-between gap-4 border-b border-hair py-2.5">
            <dt className="shrink-0 text-[12px] text-ink-500">{l.rotulo}</dt>
            <dd
              className={`truncate text-right text-[12.5px] font-medium text-ink-900 ${
                l.destaque ? 'font-mono tracking-tight' : ''
              }`}
              title={l.valor}
            >
              {l.valor}
            </dd>
          </div>
        ))}
      </dl>
      <p className="pt-2 text-[10.5px] leading-snug text-ink-400">
        CPF mascarado conforme politica de protecao de dados pessoais (LGPD). Para conferencia de titularidade,
        peca ao cliente os digitos visiveis.
      </p>
    </section>
  );
}

// ----------------------------- Historico recente -----------------------------

function BlocoHistorico({ card }: Props) {
  return (
    <section className="pt-5">
      <h3 className="label-caps mb-2 text-ink-700">Historico Recente</h3>
      <ul className="space-y-1">
        {card.historicoRecente.map((h) => (
          <li
            key={h.protocolo}
            className={`flex gap-2.5 rounded-lg px-2.5 py-2 ${
              h.ativo ? 'border-l-2 border-claro-red bg-claro-rose' : ''
            }`}
          >
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${h.ativo ? 'bg-claro-red' : 'bg-ink-400/60'}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={`truncate text-[12.5px] ${h.ativo ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
                  {h.assunto}
                </p>
                {h.ativo && (
                  <span className="shrink-0 rounded-full bg-claro-red px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                    Agora
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10.5px] text-ink-400">{h.data}</span>
                <span className="rounded bg-canvas px-1.5 py-0.5 text-[9.5px] text-ink-500">{h.origem}</span>
                <span className="font-mono text-[9.5px] text-ink-400">#{h.protocolo}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
