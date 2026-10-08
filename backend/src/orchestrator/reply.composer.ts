import { DiagnosticoRede, Oferta } from '../mocks/mocks.service';
import { CATALOGO_INTENCOES, NomeIntencao, ResultadoNlu } from '../nlu/nlu.types';

export interface RespostaComposta {
  texto: string;
  /** Preenchido na desambiguacao de palpite unico, para registro no contexto. */
  intencaoSugerida?: NomeIntencao;
  quickReplies: string[];
}

interface EntradaComposicao {
  primeiroNome: string;
  nlu: ResultadoNlu;
  diagnostico: DiagnosticoRede | null;
  oferta: Oferta | null;
  ofertaConfirmada: boolean;
  protocolo: string | null;
  primeiroTurno: boolean;
}

/**
 * Monta a resposta unificada ao cliente. O ponto central da proposta do OmniClaro:
 * suporte tecnico e venda saem em UMA unica mensagem, nao em dois atendimentos.
 */
export function comporResposta(e: EntradaComposicao): RespostaComposta {
  const blocos: string[] = [];
  const quickReplies: string[] = [];

  const abertura = e.primeiroTurno
    ? `Oi, ${e.primeiroNome}! Sou o assistente da Claro.`
    : `Certo, ${e.primeiroNome}.`;

  // --- Confirmacao de contratacao tem prioridade sobre o resto ---
  if (e.ofertaConfirmada && e.oferta) {
    blocos.push(
      `${abertura} Contratacao confirmada. O ${e.oferta.nome} ja esta ativo na sua conta por ${e.oferta.preco_formatado}, ` +
        `com o primeiro mes por nossa conta e cobranca na mesma fatura da sua banda larga.`,
    );
    blocos.push('Voce ja consegue assistir agora mesmo pelo app Claro tv+ usando o mesmo login da sua conta Claro.');
    if (e.protocolo) blocos.push(`Protocolo desta solicitacao: *${e.protocolo}*.`);
    return { texto: blocos.join('\n\n'), quickReplies: ['Como acesso o app?', 'Ver minha fatura', 'Falar com atendente'] };
  }

  const partes: string[] = [];

  // --- Bloco de suporte tecnico ---
  if (e.diagnostico) {
    const status = e.diagnostico.status_final === 'ONLINE' ? 'normalizado' : 'ainda instavel';
    partes.push(
      `Sobre a instabilidade: rodei um diagnostico remoto no seu ${e.diagnostico.equipamento} agora. ` +
        `${e.diagnostico.mensagem} O sinal esta ${status} (potencia ${e.diagnostico.potencia_sinal_dbm} dBm, latencia ${e.diagnostico.latencia_ms} ms). ` +
        `Da uma olhada nos proximos minutos e me diz se melhorou.`,
    );
    quickReplies.push('Ver status do modem');
  }

  // --- Bloco comercial ---
  if (e.oferta) {
    const beneficio = e.oferta.beneficios[0] ? ` ${e.oferta.beneficios[0]}.` : '';
    partes.push(
      `E sobre o streaming: da pra incluir o ${e.oferta.nome} por ${e.oferta.preco_formatado}.${beneficio} ` +
        `${e.oferta.fidelidade_meses === 0 ? 'Sem fidelidade' : `Fidelidade de ${e.oferta.fidelidade_meses} meses`} e tudo na mesma fatura.`,
    );
    const rotulo = e.oferta.nome.includes('HBO') ? 'Confirmar HBO' : `Confirmar ${e.oferta.nome}`;
    quickReplies.unshift(rotulo);
  }

  // --- Nenhuma acao executavel: pede detalhe ---
  if (partes.length === 0) {
    const intencao = e.nlu.intencoes[0]?.nome;
    if (intencao === 'SAUDACAO') {
      partes.push('Como posso te ajudar hoje? Consigo resolver problemas de conexao, ver sua fatura e ativar servicos na sua conta.');
      quickReplies.push('Minha internet esta caindo', 'Ver minha fatura', 'Ver ofertas de streaming');
    } else if (intencao === 'CONSULTA_FATURA' || intencao === 'SEGUNDA_VIA_FATURA') {
      partes.push(
        'Sobre a fatura: neste prototipo a consulta de faturamento esta mockada, entao vou te encaminhar para um atendente que consegue puxar o documento.',
      );
      quickReplies.push('Falar com atendente');
    } else {
      partes.push('Consegue me contar um pouco mais sobre o que esta acontecendo? Assim eu ja resolvo por aqui.');
      quickReplies.push('Falar com atendente');
    }
  }

  blocos.push(`${abertura} ${partes[0]}`);
  blocos.push(...partes.slice(1));

  if (e.protocolo && e.diagnostico) {
    blocos.push(`Protocolo do atendimento: *${e.protocolo}*.`);
  }

  if (e.nlu.sentimento === 'FRUSTRADO') {
    blocos.splice(
      1,
      0,
      'Sei que ficar sem uma conexao estavel e bem chato, e desculpa por isso. Ja estou tratando aqui.',
    );
  }

  if (!quickReplies.includes('Falar com atendente')) quickReplies.push('Falar com atendente');

  return { texto: blocos.join('\n\n'), quickReplies: quickReplies.slice(0, 4) };
}

/** Mensagem enviada ao cliente no momento do transbordo. */
export function comporMensagemTransbordo(primeiroNome: string, protocolo: string, posicaoFila: number): string {
  const espera = posicaoFila <= 1 ? 'Ja estou passando agora' : `Voce e o ${posicaoFila}o da fila`;
  return (
    `Beleza, ${primeiroNome}. Vou te passar para um atendente humano. ` +
    `${espera} — e ja mandei junto todo o resumo do que conversamos aqui, entao voce nao vai precisar repetir nada.\n\n` +
    `Protocolo: *${protocolo}*.`
  );
}

/** Atalhos das jornadas principais, oferecidos quando nao ha pista melhor. */
const ATALHOS_PADRAO = ['Minha internet esta caindo', 'Ver minha fatura', 'Ver ofertas de streaming'];

/**
 * Pergunta de desambiguacao, acionada quando a confianca fica abaixo do limiar
 * (secao 7.2 da documentacao). Antes o orquestrador escalava direto para um
 * humano; perguntar primeiro resolve a maior parte dos casos sozinho e protege
 * a meta de FCR.
 *
 * Na pratica o Gemini devolve UM palpite com score baixo, nao uma lista de
 * empatados — entao o caminho que mais acontece e o de confirmar esse palpite,
 * nao o de oferecer duas alternativas. Descartar esse palpite e cair no texto
 * generico jogaria fora a melhor pista disponivel.
 */
export function comporDesambiguacao(primeiroNome: string, intencoes: NomeIntencao[]): RespostaComposta {
  // Vocativo so quando ha nome de verdade: cliente nao identificado viraria
  // "Desculpa, Cliente,".
  const voce = primeiroNome && primeiroNome !== 'Cliente' ? primeiroNome : '';

  const candidatos = [...new Set(intencoes)]
    .map((nome) => ({ nome, meta: CATALOGO_INTENCOES[nome] }))
    .filter((c) => c.meta?.rotulo)
    // "falar com atendente" e "cancelamento" nunca viram opcao sugerida:
    // oferece-los seria empurrar o cliente para fora da automacao.
    .filter((c) => c.nome !== 'FALAR_COM_ATENDENTE' && c.nome !== 'CANCELAMENTO')
    .slice(0, 3);

  // Dois ou mais palpites: pergunta qual deles.
  if (candidatos.length >= 2) {
    const rotulos = candidatos.map((c) => c.meta.rotulo);
    const ultimo = rotulos.pop();
    return {
      texto:
        `${voce ? voce + ', s' : 'S'}o para eu nao te mandar para o lugar errado: ` +
        `voce quer ajuda com ${rotulos.join(', ')} ou com ${ultimo}?`,
      quickReplies: [...candidatos.map((c) => c.meta.atalho), 'Falar com atendente'],
    };
  }

  // Um palpite so: confirma esse, mas deixa as outras jornadas a um clique.
  if (candidatos.length === 1) {
    const { meta, nome } = candidatos[0];
    const outros = ATALHOS_PADRAO.filter((a) => a !== meta.atalho).slice(0, 2);
    return {
      texto:
        `${voce ? 'Deixa eu confirmar, ' + voce + ': v' : 'Deixa eu confirmar: v'}oce quer falar sobre ` +
        `${meta.rotulo}?\n\nSe nao for isso, me conta com outras palavras que eu te ajudo.`,
      quickReplies: [meta.atalho, ...outros, 'Falar com atendente'].filter(Boolean).slice(0, 4),
      intencaoSugerida: nome,
    };
  }

  // Nenhuma pista: abre o leque das jornadas que o sistema resolve.
  return {
    texto:
      `${voce ? 'Desculpa, ' + voce + ', n' : 'Desculpa, n'}ao entendi direito. ` +
      'Pode me contar com outras palavras?\n\n' +
      'Consigo resolver problema de conexao, ver sua fatura e ativar servicos na sua conta.',
    quickReplies: [...ATALHOS_PADRAO, 'Falar com atendente'],
  };
}
