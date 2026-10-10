/**
 * Povoa a fila com chamados de prioridades diferentes, para demonstracao.
 *
 *   node backend/scripts/povoar-fila.js            -> porta 3000 (versao nova)
 *   node backend/scripts/povoar-fila.js 3001       -> outra porta
 *
 * Cada cenario foi escolhido para cair num nivel distinto da pontuacao de
 * prioridade (sentimento, urgencia, risco de cancelamento, reincidencia).
 * Os telefones correspondem aos clientes do seed, senao a fila fica cheia de
 * "Cliente nao identificado".
 */
const PORTA = process.argv[2] ?? '3000';
const API = `http://localhost:${PORTA}/api/v1`;

/**
 * Lucas Henrique Ferreira NAO entra aqui de proposito: o chat do cliente usa
 * o telefone dele. Se a sessao do Lucas ja estiver em transbordo, o bot sai do
 * caminho e a demonstracao ao vivo do chat nao responde nada.
 * Ele fica reservado para o atendimento gravado, que entra na fila na hora.
 */
const CENARIOS = [
  {
    nivelEsperado: 'CRITICA / ALTA',
    cliente: 'Carlos Eduardo Nunes (reincidente)',
    telefone: '+5511944442222',
    texto:
      'De novo sem sinal! Voces ja trocaram o aparelho e continua a mesma coisa. ' +
      'Estou muito irritado, quero falar com um atendente.',
  },
  {
    nivelEsperado: 'ALTA',
    cliente: 'Roberto Carvalho Lima (empresarial)',
    telefone: '+5511922220000',
    texto:
      'Estou sem internet na empresa desde cedo e isso esta parando o atendimento. ' +
      'Preciso falar com alguem urgente.',
  },
  {
    nivelEsperado: 'MEDIA',
    cliente: 'Juliana Ribeiro Matos',
    telefone: '+5511933331111',
    texto: 'Oi, minha internet esta um pouco lenta a noite. Pode me passar para um atendente?',
  },
  {
    nivelEsperado: 'BAIXA',
    cliente: 'Mariana Alves Prado',
    telefone: '+5511955551111',
    texto: 'Boa tarde! Gostaria de falar com um atendente para tirar uma duvida sobre o meu plano, por favor.',
  },
];

async function enviar(cenario) {
  const resposta = await fetch(`${API}/webhooks/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto: cenario.texto, canal: 'WHATSAPP', telefone: cenario.telefone }),
  });
  return resposta.json();
}

(async () => {
  console.log(`\n  Povoando a fila em ${API}\n`);

  for (const cenario of CENARIOS) {
    process.stdout.write(`  ${cenario.nivelEsperado.padEnd(16)} ${cenario.cliente.padEnd(38)}`);
    try {
      const r = await enviar(cenario);
      const protocolo = r.handoff?.protocolo ?? r.protocolo ?? '-';
      const nivel = r.handoff?.prioridade?.nivel ?? '(sem prioridade nesta versao)';
      console.log(`${String(r.modo).padEnd(14)} ${String(nivel).padEnd(10)} #${protocolo}`);
    } catch (erro) {
      console.log(`FALHOU: ${erro.message}`);
    }
    // Espaca as chamadas: o Gemini responde melhor sem rajada.
    await new Promise((r) => setTimeout(r, 900));
  }

  console.log('\n  Pronto. Abra a fila no dashboard para ver a ordenacao.\n');
})();
