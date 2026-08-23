# OmniClaro — Protótipo Funcional

Orquestrador conversacional unificado para a Claro (WhatsApp, App Minha Claro e Portal Web), integrando **suporte técnico**, **faturamento** e **vendas** em um único fluxo de IA.

Projeto acadêmico — FIAP, 4SIS.

---

## O que este protótipo demonstra

A jornada priorizada na documentação: **Suporte Técnico Residencial de Banda Larga com Diagnóstico Remoto + Cross-selling de Streaming, incluindo transbordo humano.**

O ponto central: o cliente escreve **uma frase com duas intenções** e recebe **uma resposta unificada** — não dois atendimentos.

```
Cliente:  "Meu Wi-Fi está caindo toda hora, e queria saber se tem pacote com HBO"
             │
             ▼
   POST /api/v1/webhooks/messages          (simula o webhook do WhatsApp)
             │
             ▼
   Sessão em cache  session:customer:{id}  TTL 24h
             │
             ▼
   Gemini 3.6 Flash com responseSchema forçado (thinkingLevel: low)
   → SUPORTE_TECNICO_INSTABILIDADE (0.94) + CONTRATACAO_SERVICO_STREAMING (0.91)
             │
             ├──────────────┬──────────────┐   despacho EM PARALELO
             ▼              ▼              │
   mock reset de rede   mock catálogo      │
   (latência 2–3 s)     (oferta HBO Max)   │
             └──────────────┴──────────────┘
             ▼
   Resposta humanizada única + quick replies
   ("Confirmar HBO" / "Ver status do modem")
             │
             ▼   se o cliente pedir atendente OU confiança < 0.80
   Transbordo → WebSocket → OmniDashboard
   (resumo cognitivo + dados validados + histórico + conversa completa)
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Orquestrador | Node.js 20+ · TypeScript · **NestJS 10** |
| Motor de NLU | **Google Gemini** `gemini-3.6-flash` via `@google/generative-ai`, com `responseSchema` JSON forçado |
| Sessão / contexto | **Redis** (`ioredis`) — ou cache em memória com a mesma interface |
| Persistência | **PostgreSQL** ou **SQLite** (`sql.js`), abstraídos por **TypeORM** |
| Tempo real | **Socket.io** (orquestrador ↔ OmniDashboard ↔ chat do cliente) |
| OmniDashboard | React 18 · Vite · TailwindCSS · socket.io-client |
| Chat do cliente | React 18 · Vite · TailwindCSS |

O **Gemini é o único componente que chama uma API externa real.** Rede e catálogo comercial são mocks, conforme a Matriz de Status do Protótipo — não há integração SOAP nem billing real.

---

## Como rodar

### Modo simplificado — sem Docker (recomendado para a banca)

Usa SQLite (`sql.js`, WebAssembly, sem compilação nativa) e cache em memória com a mesma semântica de TTL do Redis.

```bash
npm install
```

Copie o arquivo de exemplo e preencha a chave do Gemini:

```bash
cp .env.example backend/.env
```

Abra `backend/.env` e preencha **apenas esta linha**:

```
GEMINI_API_KEY=sua_chave_aqui
```

A chave é gerada em https://aistudio.google.com/app/apikey. Sem ela o sistema continua rodando ponta a ponta, mas o NLU cai para um extrator heurístico determinístico (`fonte: FALLBACK_HEURISTICO` na resposta) em vez do Gemini.

Suba tudo com um comando:

```bash
npm run dev
```

| Serviço | URL |
|---|---|
| Orquestrador (API + WebSocket) | http://localhost:3000 |
| **OmniDashboard** (atendente) | http://localhost:5173 |
| **Chat do cliente** | http://localhost:5174 |

O banco é criado e populado automaticamente na primeira subida (cliente Lucas Henrique Ferreira + 3 protocolos de histórico). Para repopular manualmente: `npm run seed`.

### Modo Docker — Postgres + Redis reais

Requer Docker Desktop instalado.

```bash
cp .env.example .env
```

Preencha a `GEMINI_API_KEY` no `.env` da raiz e suba:

```bash
docker compose up --build
```

O compose já injeta `DB_DRIVER=postgres` e `CACHE_DRIVER=redis` no backend — o mesmo código roda nos dois modos, sem alteração.

---

## Roteiro de demonstração (3 minutos)

1. Abra **os dois frontends lado a lado**: OmniDashboard em `:5173` e o chat do cliente em `:5174`.
2. No chat, clique no cenário **"Meu Wi-Fi está caindo toda hora, e queria saber se tem pacote com HBO"**.
   - O assistente leva ~2–3 s (o diagnóstico remoto e a consulta ao catálogo rodam **em paralelo**).
   - Volta **uma única resposta** cobrindo o problema técnico *e* a oferta, com quick replies.
3. Ainda no chat, clique em **"Falar com atendente"**.
4. Olhe para o OmniDashboard: o card entra na **fila de transbordo em tempo real**, já com resumo cognitivo da IA.
5. Clique em **Assumir**. O painel completo abre — conversa ao vivo à esquerda, **AI Context Panel** à direita.
6. Responda pelo dashboard: a mensagem aparece **instantaneamente** no chat do cliente, via WebSocket.

Ponto a destacar na banca: o atendente recebe o caso **com todo o contexto pronto** — resumo, dados validados, histórico e a conversa inteira. O cliente não repete nada.

---

## Testando pela API (curl / Postman)

**Payload principal — dupla intenção:**

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/messages -H "Content-Type: application/json" -d "{\"texto\":\"Meu Wi-Fi esta caindo toda hora, e queria saber se tem pacote com HBO\",\"canal\":\"WHATSAPP\",\"telefone\":\"+5511992314872\"}"
```

**Transbordo explícito:**

```bash
curl -X POST http://localhost:3000/api/v1/webhooks/messages -H "Content-Type: application/json" -d "{\"texto\":\"quero falar com um atendente\",\"telefone\":\"+5511992314872\"}"
```

**Sanidade da stack** (mostra qual driver de banco/cache está ativo e se o Gemini está configurado):

```bash
curl http://localhost:3000/api/v1/health
```

### Endpoints

| Método | Rota | Função |
|---|---|---|
| `POST` | `/api/v1/webhooks/messages` | Ingestão de mensagem do cliente (simula o webhook do WhatsApp) |
| `POST` | `/api/v1/nlp/process-intent` | Chama o Gemini isoladamente, com schema JSON forçado |
| `GET` | `/api/v1/sessions/:id` | Contexto vivo da sessão no Redis (inclui TTL restante) |
| `POST` | `/api/v1/handoff/queue` | Enfileira transbordo |
| `GET` | `/api/v1/handoff/queue` | Fila atual do dashboard |
| `POST` | `/api/v1/handoff/queue/:protocolo/accept` | Atendente assume o caso |
| `POST` | `/api/v1/mock/network/reset-signal` | Mock de diagnóstico remoto (latência 2–3 s) |
| `GET` | `/api/v1/mock/catalog/offers` | Mock do catálogo comercial |
| `GET` | `/api/v1/health` | Sanidade da stack |

### Eventos WebSocket

| Direção | Evento | Payload |
|---|---|---|
| cliente → servidor | `dashboard:join` | — (entra na sala do dashboard) |
| cliente → servidor | `customer:join` | `{ sessionId }` |
| cliente → servidor | `agent:accept` | `{ protocolo, operador }` |
| cliente → servidor | `agent:message` | `{ sessionId, texto, operador }` |
| cliente → servidor | `agent:close` | `{ sessionId, protocolo }` |
| servidor → cliente | `handoff:new` | card completo do transbordo |
| servidor → cliente | `queue:update` | fila inteira |
| servidor → cliente | `message:new` | `{ sessionId, remetente, texto, timestamp }` |
| servidor → cliente | `context:update` | contexto de sessão atualizado |
| servidor → cliente | `session:status` | `{ sessionId, status, operador }` |

---

## Modelo de dados

| Entidade | Campos |
|---|---|
| `Cliente` | `id`, `cpf_cnpj`, `nome`, `telefone`, `email`, `tipo_contrato`, `data_criacao` **+** `plano_ativo`, `endereco`, `cliente_desde`, `ultima_os`, `status_conta` |
| `Sessao` | `id` (uuid), `id_cliente`, `canal_origem`, `status_sessao` (ATIVA/HANDOFF/ENCERRADA), `data_inicio`, `data_fim` |
| `Mensagem` | `id` (uuid), `id_sessao`, `remetente` (CLIENTE/BOT/ATENDENTE), `conteudo_texto`, `timestamp` |
| `IntencaoExtraida` | `id`, `id_mensagem`, `nome_intencao`, `score_confianca`, `payload_entidades` (JSON) |
| `Protocolo` | `numero_protocolo` (PK), `id_cliente`, `id_sessao`, `status` (ABERTO/RESOLVIDO/ESCALADO), `data_abertura` **+** `assunto`, `origem` |
| `AtendimentoHumano` | `id`, `numero_protocolo`, `id_operador`, `resumo_cognitivo_ia`, `tempo_espera_segundos` **+** `status`, `id_sessao` |

Os campos marcados com **+** são acréscimos ao schema mínimo, necessários para alimentar os blocos "Perfil do Cliente" e "Histórico Recente" do AI Context Panel.

---

## LGPD — mascaramento de CPF

O mockup original do Figma exibia o CPF integral (`412.763.088-94`) no painel do atendente. A documentação do projeto exige mascaramento de dados pessoais, então o protótipo aplica a máscara em **duas camadas**:

1. **No orquestrador** (`backend/src/common/mask.util.ts`) — o card de transbordo carrega o campo `cpfMascarado`; o CPF integral **nunca trafega** pela API nem pelo WebSocket.
2. **No frontend** (`dashboard/src/lib/mask.ts`) — segunda barreira, aplicada a qualquer CPF que chegue integral por outra rota.

O painel renderiza `***.763.088-**`: dígitos suficientes para o atendente conferir a titularidade por voz, sem expor o documento na tela.

---

## Regra de transbordo

O orquestrador escala para atendimento humano quando **qualquer** das condições ocorre:

- o cliente pede explicitamente (`FALAR_COM_ATENDENTE`) ou sinaliza cancelamento (`CANCELAMENTO`);
- o Gemini marca `requer_humano: true` no JSON estruturado;
- a maior confiança entre as intenções fica **abaixo de `HANDOFF_CONFIDENCE_THRESHOLD`** (padrão `0.80`, configurável no `.env`).

---

## Variáveis de ambiente

| Variável | Padrão | Função |
|---|---|---|
| `GEMINI_API_KEY` | — | Chave do Google AI Studio. Vazia ⇒ fallback heurístico |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Modelo do NLU |
| `GEMINI_THINKING_LEVEL` | `low` | Esforço de raciocínio (Gemini 3.x). Vazio = padrão do modelo |
| `DB_DRIVER` | `sqlite` | `sqlite` ou `postgres` |
| `DB_SQLITE_FILE` | `./data/omniclaro.db` | Arquivo do SQLite |
| `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` | — | Conexão Postgres |
| `CACHE_DRIVER` | `memory` | `memory` ou `redis` |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Conexão Redis |
| `SESSION_TTL_SECONDS` | `86400` | TTL da sessão (24 h) |
| `HANDOFF_CONFIDENCE_THRESHOLD` | `0.80` | Limiar de confiança para transbordo |
| `PORT` | `3000` | Porta do orquestrador |

---

## Estrutura

```
omniclaro/
├── backend/                    Orquestrador NestJS
│   └── src/
│       ├── orchestrator/       Webhook + fluxo principal + composição da resposta
│       ├── nlu/                Gemini (schema forçado) + fallback heurístico
│       ├── session/            Contexto em Redis (session:customer:{id}, TTL 24 h)
│       ├── cache/              Abstração Redis ↔ memória
│       ├── conversation/       Persistência de cliente/sessão/mensagem/intenção/protocolo
│       ├── handoff/            Transbordo e montagem do card do dashboard
│       ├── realtime/           Gateway Socket.io
│       ├── mocks/              Diagnóstico de rede e catálogo comercial
│       ├── database/           Entidades TypeORM + seed
│       └── common/             Mascaramento LGPD, geração de protocolo
├── dashboard/                  OmniDashboard (React + Vite + Tailwind)
├── customer-chat/              Chat do cliente (React + Vite + Tailwind)
├── docker-compose.yml          Postgres + Redis + backend + frontends
└── .env.example
```

---

## Limitações conhecidas (escopo do protótipo)

- **Sem autenticação real.** Não há OAuth nem MFA; o operador é fixo (`Mariana Costa`). Intencional para um protótipo acadêmico.
- **Faturamento não implementado.** Consultas de fatura caem em transbordo. Não há integração SOAP nem billing, conforme a Matriz de Status do Protótipo.
- **Rede e catálogo são mocks.** O reset de sinal simula latência de 2–3 s e sempre retorna sucesso.
- **`synchronize: true` no TypeORM.** Aceitável em protótipo; em produção exigiria migrations versionadas.
- **Desvio de modelo em relação à documentação técnica.** A documentação especifica `gemini-1.5-flash`, mas esse modelo foi **descontinuado pelo Google** — a API responde `404 Not Found` para ele, e a família 1.5 inteira saiu do catálogo. O `gemini-2.5-flash` também já está fechado para novas chaves. O protótipo usa **`gemini-3.6-flash`**, que é o substituto indicado pela própria mensagem de erro da API e mantém suporte completo a `responseSchema`. Trocar de modelo é uma linha no `.env` (`GEMINI_MODEL`), sem alteração de código.

- **`GEMINI_THINKING_LEVEL=low` é necessário, não é otimização opcional.** Os modelos Gemini 3.x raciocinam antes de responder por padrão, o que levava a extração de intenção de ~1,3 s para ~20 s — inviável para demonstração ao vivo. Com `thinkingLevel: low` o resultado é idêntico (mesmas intenções, mesmas entidades) em 1,3 s. Se você trocar para um modelo fora da família 3.x, deixe essa variável vazia: o parâmetro não existe lá e a API devolve `400`.
