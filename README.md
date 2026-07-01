# Market Agents

Dashboard multi-agente para análise simples de notícias de cripto.

## Estrutura

```text
frontend/
  index.html
  styles.css
  app.js
server/
  server.js
  agents/
    collector/index.js
    community/index.js
    filter/index.js
    risk/index.js
    sentiment/index.js
    security/index.js
    spam/index.js
    translator/index.js
    gitAgent.js
    intelligence/index.js
    market/index.js
    backtest/index.js
  database/database.json
  logs/.gitkeep
package.json
.env.example
```

## Como rodar

1. Instale as dependências:

```powershell
npm install
```

2. Crie seu `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

3. Inicie o servidor:

```powershell
npm start
```

4. Abra no navegador:

```text
http://localhost:3000
```

## Rodar com agentes separados em containers

Cada agente roda em um container proprio e o servidor principal faz a orquestracao por HTTP.

```powershell
docker compose up --build
```

Servicos:

```text
api              http://localhost:3000
security-agent   http://localhost:3101/health
collector-agent  http://localhost:3102/health
spam-agent       http://localhost:3105/health
filter-agent     http://localhost:3103/health
risk-agent       http://localhost:3106/health
sentiment-agent  http://localhost:3104/health
translator-agent http://localhost:3107/health
community-agent  http://localhost:3108/health
git-agent        http://localhost:3109/health
intelligence-agent http://localhost:3110/health
market-agent     http://localhost:3111/health
backtest-agent   http://localhost:3112/health
```

Para verificar a conexao dos agentes pelo orquestrador:

```text
http://localhost:3000/agents
```

Se o Docker ainda nao estiver instalado, use a simulacao local com os mesmos servicos separados por porta:

```powershell
.\start_agents_local.ps1
```

Para iniciar com Docker depois:

```powershell
.\start_containers.ps1
```

## Verificar vulnerabilidades

As imagens finais removem `npm`, `npx`, `yarn` e `corepack` do runtime. O app roda com `node` direto e usuario nao-root.

```powershell
docker scout cves agentes-api:latest --only-fixed
docker scout cves agentes-translator-agent:latest --only-fixed
```

## Teste rápido dos agentes

```powershell
npm run test:agents -- BTC
```

Nunca coloque chaves de API no frontend ou no GitHub. Use sempre `.env`.

## Observacoes

O coletor tenta usar CryptoCompare primeiro. Se a API pedir chave, ele usa RSS publico do Cointelegraph como fallback para manter o MVP funcionando.

O Git Agent usa a API publica do GitHub para buscar commits, issues/PRs, releases e forks antes desses sinais virarem noticia. Para evitar rate limit, configure `GITHUB_TOKEN` no `.env`. Repos monitorados podem ser ajustados com `GITHUB_REPOS`, por exemplo `BTC=bitcoin/bitcoin,ETH=ethereum/go-ethereum`.

O Intelligence Agent cruza noticias, risco, sentimento, contexto comunitario e GitHub para explicar segmentos, conflitos entre sinais, confianca e postura operacional.

Fase 2 adiciona o Market Agent: ciclo BTC, probabilidade heuristica de altseason, regime risk-on/risk-off, rotacao setorial e saude basica do ativo usando dados publicos de mercado quando disponiveis.

O Backtest Agent roda uma simulacao simples por simbolo usando coleta, filtro, sentimento e risco. Ele fica disponivel em `/backtest/run`, por exemplo `http://localhost:3000/backtest/run?symbols=BTC,ETH`.

