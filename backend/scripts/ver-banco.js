
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const ARQUIVO = path.resolve(__dirname, '..', 'data', 'omniclaro.db');
const LIMITE = parseInt(process.argv[2] ?? '0', 10) || null;

const TABELAS = [
  { nome: 'cliente', titulo: 'CLIENTE', colunas: ['id', 'nome', 'cpf_cnpj', 'telefone', 'plano_ativo', 'status_conta'] },
  { nome: 'sessao', titulo: 'SESSAO', colunas: ['id', 'id_cliente', 'canal_origem', 'status_sessao', 'data_inicio'] },
  { nome: 'mensagem', titulo: 'MENSAGEM', colunas: ['id', 'id_sessao', 'remetente', 'conteudo_texto', 'timestamp'] },
  {
    nome: 'intencao_extraida',
    titulo: 'INTENCAO EXTRAIDA  <-- saida estruturada do Gemini',
    colunas: ['id', 'id_mensagem', 'nome_intencao', 'score_confianca', 'payload_entidades'],
  },
  { nome: 'protocolo', titulo: 'PROTOCOLO', colunas: ['numero_protocolo', 'id_cliente', 'status', 'assunto', 'origem'] },
  {
    nome: 'atendimento_humano',
    titulo: 'ATENDIMENTO HUMANO  <-- transbordo',
    colunas: ['id', 'numero_protocolo', 'id_operador', 'status', 'tempo_espera_segundos', 'resumo_cognitivo_ia'],
  },
];

const LARGURA_MAX = 46;

function encurtar(valor, coluna) {
  if (valor === null || valor === undefined) return '-';
  let texto = String(valor);

  // Ids uuid inteiros poluem a tela; o prefixo basta para correlacionar linhas.
  if ((coluna === 'id' || coluna.startsWith('id_')) && texto.length > 20) {
    texto = texto.slice(0, 8);
  }
  if (coluna === 'timestamp' || coluna === 'data_inicio') {
    texto = texto.replace('T', ' ').slice(0, 19);
  }
  texto = texto.replace(/\s+/g, ' ').trim();
  return texto.length > LARGURA_MAX ? texto.slice(0, LARGURA_MAX - 1) + '…' : texto;
}

function imprimirTabela(titulo, colunas, linhas) {
  console.log('');
  console.log('═'.repeat(120));
  console.log(`  ${titulo}   (${linhas.length} ${linhas.length === 1 ? 'registro' : 'registros'})`);
  console.log('═'.repeat(120));

  if (linhas.length === 0) {
    console.log('  (vazia)');
    return;
  }

  const larguras = colunas.map((c, i) =>
    Math.max(c.length, ...linhas.map((l) => encurtar(l[i], c).length)),
  );

  console.log('  ' + colunas.map((c, i) => c.toUpperCase().padEnd(larguras[i])).join('  │  '));
  console.log('  ' + larguras.map((w) => '─'.repeat(w)).join('──┼──'));

  for (const linha of linhas) {
    console.log('  ' + colunas.map((c, i) => encurtar(linha[i], c).padEnd(larguras[i])).join('  │  '));
  }
}

(async () => {
  if (!fs.existsSync(ARQUIVO)) {
    console.error(`\nBanco nao encontrado em ${ARQUIVO}`);
    console.error('Suba o projeto uma vez com `npm run dev` para que ele seja criado.\n');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(ARQUIVO));

  console.log('');
  console.log(`  OmniClaro — banco de dados`);
  console.log(`  ${ARQUIVO}  (${(fs.statSync(ARQUIVO).size / 1024).toFixed(0)} KB)`);

  for (const { nome, titulo, colunas } of TABELAS) {
    let sql = `SELECT ${colunas.join(', ')} FROM ${nome}`;
    if (LIMITE) sql += ` ORDER BY rowid DESC LIMIT ${LIMITE}`;

    let resultado;
    try {
      resultado = db.exec(sql);
    } catch (erro) {
      console.log(`\n  ${titulo}: tabela ausente (${erro.message})`);
      continue;
    }

    const linhas = resultado.length ? resultado[0].values : [];
    if (LIMITE) linhas.reverse();
    imprimirTabela(titulo, colunas, linhas);
  }

  console.log('');
  db.close();
})();
