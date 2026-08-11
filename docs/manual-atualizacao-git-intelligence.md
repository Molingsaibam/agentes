# Manual da atualizacao Git, Market e Intelligence

Este manual descreve a atualizacao feita no orquestrador principal, no Git Agent,
no Translator e no armazenamento de historico.

## Resumo do que mudou

- O endpoint `POST /jobs` agora aceita tanto simbolos de ativos quanto repositorios do GitHub.
- Analises por simbolo continuam rodando o fluxo completo: seguranca, coleta, comunidade, spam, filtro, sentimento, risco, traducao, market, GitHub e intelligence.
- Analises por repositorio rodam em modo Git-first: nao inventam noticias para um ticker desconhecido, mas geram Git, intelligence e resumo do repositorio.
- O Git Agent passou a entender entradas por `symbol`, `repo`, `tracked`, URLs do GitHub e a variavel `GITHUB_REPOS`.
- O Git Agent agora retorna campos prontos para a UI: `lead_score`, `market_signal`, `signal_summary`, `difficulties` e `successes`.
- O Translator voltou a entregar o formato esperado pelo frontend: `translated.title`, `translated.body` e `translated.mode`.
- O historico de jobs agora le tanto `jobs` quanto `reports` dentro de `server/database/database.json`.
- O endpoint `/health` passou a retornar o payload completo, incluindo metricas locais disponiveis.
- Foi adicionado `GET /backtest/run`, conforme o README ja indicava.

## Arquivos atualizados

- `server/server.js`: orquestracao dos jobs, health, backtest e suporte a repo GitHub.
- `server/agents/gitAgent.js`: normalizacao de entrada, defaults por simbolo e resumo de sinais Git.
- `server/agents/translator/index.js`: traducao estruturada para titulo/corpo.
- `server/database/store.js`: leitura compatibilizada entre `jobs` e `reports`.

## Como usar

### Criar analise por simbolo

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/jobs" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"symbol":"BTC"}'
```

### Criar analise por repositorio GitHub

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/jobs" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"repo":"https://github.com/bitcoin/bitcoin"}'
```

### Consultar um job

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/jobs/ID_DO_JOB"
```

### Rodar scan Git direto

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/git/scan" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"symbol":"BTC","commitLimit":3}'
```

Tambem e possivel passar repositorio direto:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/git/scan" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"repo":"smartcontractkit/chainlink","commitLimit":3}'
```

### Rodar backtest

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/backtest/run?symbols=BTC,ETH"
```

## Configuracao recomendada

No `.env`, use:

```env
GITHUB_TOKEN=
GITHUB_REPOS=BTC=bitcoin/bitcoin,ETH=ethereum/go-ethereum,SOL=solana-labs/solana,LINK=smartcontractkit/chainlink,ZEC=zcash/zcash
GITHUB_COMMIT_LIMIT=5
MARKET_TIMEOUT_MS=12000
TRANSLATION_PROVIDER=local
```

`GITHUB_TOKEN` e opcional, mas recomendado para reduzir rate limit da API publica do GitHub.

## Campos importantes no resultado

- `result.market`: leitura de ciclo, regime de risco e saude do ativo.
- `result.git`: commits recentes, score tecnico e sinais de dificuldade/sucesso.
- `result.intelligence`: leitura consolidada entre noticias, GitHub, risco, sentimento e mercado.
- `summary.git_top_score`: maior score Git detectado.
- `summary.git_market_signal`: classificacao agregada do Git Agent.
- `summary.intelligence_action`: postura sugerida pela camada de intelligence.
- `summary.primary_segment`: segmento dominante identificado.

## Validacao feita

Foram executados:

```powershell
npm run lint
npm test
```

Tambem foi feito um smoke test local em porta temporaria com:

- `GET /health`
- `POST /jobs` com `{"symbol":"BTC"}`
- `POST /jobs` com `{"repo":"https://github.com/bitcoin/bitcoin"}`

Os dois jobs finalizaram com status `finished`.

## Observacoes

- Jobs por repositorio usam amostra de noticias vazia e fonte `repo-only`.
- Jobs por simbolo agora tentam resolver o repositorio correto antes de cair no default.
- Se um simbolo nao tiver repositorio configurado, o Git Agent retorna `market_signal: unavailable`.
- Sem chave do Etherscan, analises de ABI podem retornar erro controlado sem quebrar o fluxo principal.
