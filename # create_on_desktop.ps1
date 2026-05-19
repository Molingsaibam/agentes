# create_on_desktop.ps1
# Gera a estrutura do projeto na Área de Trabalho do Windows: Desktop\market-agents

$dest = Join-Path $env:USERPROFILE "Desktop\market-agents"
Write-Host "Criando pasta destino: $dest"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

function write-file($relativePath, $content){
    $full = Join-Path $dest $relativePath
    $dir = Split-Path $full -Parent
    if(!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $content | Out-File -FilePath $full -Encoding UTF8 -Force
    Write-Host "Criado: $relativePath"
}

# package.json
write-file 'package.json' @'
{
  "name": "market-agents",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/server.js"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "uuid": "^9.0.1"
  }
}
'@

# server/server.js
write-file 'server/server.js' @'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import morgan from 'morgan'
import { v4 as uuid } from 'uuid'
import path from 'path'
import axios from 'axios'

import { collectCoinData } from './agents/collector/index.js'
import { filterNews } from './agents/filter/index.js'
import { sentimentAnalysis } from './agents/sentiment/index.js'
import { validateSecurity } from './agents/security/index.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(helmet())
app.use(express.json())
app.use(morgan('dev'))

// Simple in-memory rate limiter (per IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30
const ipCounts = new Map()

app.use((req, res, next) => {
  try{
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    const now = Date.now()
    const entry = ipCounts.get(ip) || { count: 0, start: now }
    if(now - entry.start > RATE_LIMIT_WINDOW_MS){
      entry.count = 0
      entry.start = now
    }
    entry.count++
    ipCounts.set(ip, entry)
    if(entry.count > RATE_LIMIT_MAX){
      return res.status(429).json({ error: 'rate limit exceeded' })
    }
  }catch(e){ /* ignore limiter errors */ }
  next()
})

// Serve frontend statically if present
const frontendPath = path.join(process.cwd(), 'frontend')
app.use(express.static(frontendPath))

const jobs = {}

app.get('/', (req,res)=>{
  res.json({
    status:'online',
    agent:'market-agents'
  })
})

// Test CMC via server (proxy) — requer CMC_KEY no .env
app.get('/test-cmc', async (req, res) => {
  const symbol = (req.query.symbol || '').toString().trim()
  if(!symbol) return res.status(400).json({ error: 'symbol required' })
  const key = process.env.CMC_KEY
  if(!key) return res.status(500).json({ error: 'CMC key not configured on server' })
  try{
    const infoRes = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/info', {
      params:{ symbol },
      headers:{ 'X-CMC_PRO_API_KEY': key }
    })
    const quoteRes = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      params:{ symbol, convert: 'USD' },
      headers:{ 'X-CMC_PRO_API_KEY': key }
    })
    return res.json({ info: infoRes.data, quote: quoteRes.data })
  }catch(err){
    console.warn('CMC proxy error', err?.response?.status, err?.message)
    return res.status(502).json({ error: 'CMC proxy error', details: err?.message })
  }
})

app.post('/jobs', async (req,res)=>{
  const { symbol } = req.body

  if(!symbol){
    return res.status(400).json({
      error:'symbol required'
    })
  }

  const id = uuid()

  jobs[id] = {
    id,
    status:'processing'
  }

  res.json({ id })

  try{

    const security = await validateSecurity(symbol)

    const coin = await collectCoinData(symbol)

    const filtered = filterNews(coin.news)

    const sentiment = sentimentAnalysis(filtered)

    jobs[id] = {
      id,
      status:'finished',
      result:{
        security,
        coin,
        filtered,
        sentiment
      }
    }

  }catch(error){

    jobs[id] = {
      id,
      status:'error',
      error: error?.message || 'unknown error'
    }

  }
})

app.get('/jobs/:id', (req,res)=>{
  const job = jobs[req.params.id]

  if(!job){
    return res.status(404).json({
      error:'job not found'
    })
  }

  res.json(job)
})

// Fallback to serve frontend index.html for SPA-style routing
app.use((req,res,next)=>{
  if(req.method === 'GET' && req.accepts('html')){
    return res.sendFile(path.join(frontendPath,'index.html'))
  }
  next()
})

const port = process.env.PORT || 3000
app.listen(port, ()=>{
  console.log('Server online on port', port)
})
'@

# server/.env
write-file 'server/.env' @'
PORT=3000
CMC_KEY=SUA_CHAVE
'@

# server/database/database.json
write-file 'server/database/database.json' @'
{
  "reports": []
}
'@

# server/agents/collector/index.js
write-file 'server/agents/collector/index.js' @'
import axios from 'axios'

export async function collectCoinData(symbol){

  const url = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN`

  const response = await axios.get(url)

  const news = (response.data && response.data.Data) ? response.data.Data.slice(0,15) : []

  return {
    symbol,
    collected_at:new Date().toISOString(),
    news
  }
}
'@

# collector README
write-file 'server/agents/collector/README.md' @'
# Collector Agent

Propósito: coletar notícias e dados básicos sobre uma moeda/ativo.

Como usar:

- Exporta a função `collectCoinData(symbol)` que retorna um objeto com `symbol`, `collected_at` e `news`.
- Atualmente busca notícias na API pública CryptoCompare.

CHANGELOG

- 2026-05-19: Criado agente collector inicial com CryptoCompare e limitação a 15 notícias.
'@

# server/agents/filter/index.js
write-file 'server/agents/filter/index.js' @'
const blacklist = [
  '100x',
  'moon',
  'millionaire',
  'pump',
  'guaranteed'
]

const whitelist = [
  'etf',
  'blackrock',
  'hack',
  'security',
  'partnership',
  'listing',
  'ai',
  'rwa'
]

export function filterNews(news=[]){

  return news.filter(item=>{

    const title = (item.title || '').toLowerCase()

    const blocked = blacklist.some(word=>title.includes(word))

    if(blocked) return false

    const allowed = whitelist.some(word=>title.includes(word))

    return allowed
  })
}
'@

write-file 'server/agents/filter/README.md' @'
# Filter Agent

Propósito: filtrar notícias irrelevantes ou potencialmente scam/red flags usando listas branca e negra.

Como usar:

- Exporta a função `filterNews(news)` que recebe array de notícias e retorna só itens relevantes.

CHANGELOG

- 2026-05-19: Criado filtro básico com blacklist e whitelist.
'@

# server/agents/sentiment/index.js
write-file 'server/agents/sentiment/index.js' @'
export function sentimentAnalysis(news=[]){

  let positive = 0
  let negative = 0

  news.forEach(item=>{

    const text = (item.title || '').toLowerCase()

    if(
      text.includes('growth') ||
      text.includes('bull') ||
      text.includes('partnership')
    ){
      positive++
    }

    if(
      text.includes('hack') ||
      text.includes('lawsuit') ||
      text.includes('bear')
    ){
      negative++
    }
  })

  return {
    positive,
    negative,
    score: positive - negative
  }
}
'@

write-file 'server/agents/sentiment/README.md' @'
# Sentiment Agent

Propósito: executar análise de sentimento simples sobre títulos de notícias.

Como usar:

- Exporta a função `sentimentAnalysis(news)` que retorna { positive, negative, score }.

CHANGELOG

- 2026-05-19: Implementação inicial com contagem de palavras positivas e negativas.
'@

# server/agents/security/index.js
write-file 'server/agents/security/index.js' @'
export async function validateSecurity(symbol){

  const blocked = [
    '<script>',
    'DROP TABLE',
    '../',
    'SELECT *'
  ]

  const invalid = blocked.some(term=>
    symbol.includes(term)
  )

  if(invalid){
    throw new Error('invalid symbol')
  }

  return {
    status:'secure',
    checked_at:new Date().toISOString()
  }
}
'@

write-file 'server/agents/security/README.md' @'
# Security Agent

Propósito: validação básica de inputs / proteções iniciais.

Como usar:

- Exporta `validateSecurity(symbol)` que lança erro se encontrar termos maliciosos.

CHANGELOG

- 2026-05-19: Implementação inicial.
'@

# frontend/index.html
write-file 'frontend/index.html' @'
<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Market Agents</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>

<header>
  <h1>🤖 Market Agents</h1>
</header>

<main>

<div class="card">

<input id="symbol" placeholder="BTC / ETH / SOL">

<button id="analyzeBtn">
Analisar
</button>

</div>

<div id="status"></div>

<div id="result"></div>

</main>

<script src="app.js"></script>
</body>
</html>
'@

# frontend/styles.css
write-file 'frontend/styles.css' @'
body{
background:#0b1020;
color:white;
font-family:Arial;
padding:20px;
}

.card{
background:#151d35;
padding:20px;
border-radius:12px;
display:flex;
gap:10px;
}

input{
padding:12px;
flex:1;
background:#0f172a;
color:white;
border:none;
border-radius:8px;
}

button{
padding:12px 18px;
border:none;
border-radius:8px;
background:#7c3aed;
color:white;
font-weight:bold;
cursor:pointer;
}

#status{
margin-top:20px;
color:#a5b4fc;
}

#result{
margin-top:20px;
background:#151d35;
padding:20px;
border-radius:12px;
white-space:pre-wrap;
}
'@

# frontend/app.js
write-file 'frontend/app.js' @'
const button = document.getElementById('analyzeBtn')

button.addEventListener('click', async ()=>{

  const symbol = document
    .getElementById('symbol')
    .value
    .trim()
    .toUpperCase()

  if(!symbol){
    return alert('Digite símbolo')
  }

  const status = document.getElementById('status')
  const result = document.getElementById('result')

  status.innerText = 'Processando agentes...'

  result.innerHTML = ''

  try{

    const response = await fetch('http://localhost:3000/jobs',{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({ symbol })
    })

    const data = await response.json()

    poll(data.id)

  }catch(error){

    status.innerText = error.message

  }
})

async function poll(id){

  const status = document.getElementById('status')
  const result = document.getElementById('result')

  const interval = setInterval(async ()=>{

    const response = await fetch(
      'http://localhost:3000/jobs/' + id
    )

    const data = await response.json()

    status.innerText = data.status

    if(data.status === 'finished'){

      clearInterval(interval)

      result.innerHTML = JSON.stringify(
        data.result,
        null,
        2
      )
    }

    if(data.status === 'error'){

      clearInterval(interval)

      result.innerHTML = data.error
    }

  },2000)
}
'@

# README and git files
write-file 'README.md' @'
# Market Agents — Fase 1

Estrutura mínima de agentes, backend e frontend para coleta, filtro e análise de sentimento.

Como rodar:

1. npm install (na raiz do projeto que contém package.json)
2. configurar server/.env com PORT e CMC_KEY
3. node server/server.js
4. abrir frontend/index.html no navegador

Arquitetura:

- backend em server/
- agentes em server/agents
- frontend em frontend/

OBS: Não inclua chaves sensíveis no frontend.

## Organização e Git

Scripts úteis incluidos na raiz:

- init_repo.sh — inicializa repositório Git local e cria commit inicial.
- apply_repo_init_commit.sh — insere entrada automática no CHANGELOG.md e cria commit.
- push_to_github.sh — adiciona remote e faz push (Unix).
- push_to_github.ps1 — adiciona remote e faz push (PowerShell).

Siga GIT_INSTRUCTIONS.md para passos detalhados.
'@

write-file '.gitignore' @'
node_modules/
frontend/node_modules/
server/logs/
server/database/*.json
.env
.DS_Store
dist/
*.log
npm-debug.log*
.env.local
.vscode/
'@

write-file 'CHANGELOG.md' @'
# CHANGELOG

## [Unreleased]
- Organização inicial do projeto e agentes.

## 2026-05-19
- Inicial: criação do projeto market-agents com backend, frontend e agentes (collector, filter, sentiment, security).
'@

write-file 'CHANGES.md' @'
# Change Control Guide

Objetivo: manter histórico de alterações e instruções claras por agente.

Como registrar mudança:

1. Faça a alteração no código.
2. Atualize o arquivo `CHANGELOG.md` na raiz com resumo curto (data e descrição).
3. Atualize o `CHANGELOG` ou `README.md` do agente específico dentro de `server/agents/<agent>/README.md` com detalhes.
4. Commit e push para controle de versão (git).

Modelo de entrada no CHANGELOG.md:

- YYYY-MM-DD: Descrição curta. Autor.

Exemplo:

- 2026-05-19: Criado agente collector (coleta de notícias). — guibi

Recomendações:

- Use commits atômicos.
- Inclua referências a issues (se houver).
- Não coloque chaves sensíveis no log.
'@

# init_repo.sh
write-file 'init_repo.sh' @'
#!/usr/bin/env bash
set -e

echo "Inicializando repositório git..."
if [ -d .git ]; then
  echo "Já existe um repositório git nesta pasta"
  exit 0
fi

git init
git add .
git commit -m "chore: initial project structure"

echo "Repositório inicializado e commit criado."

echo "Dicas: configure seu user.name e user.email se necessário:"
 echo "  git config --global user.name \"Seu Nome\""
 echo "  git config --global user.email \"seu@email\""

echo "Pronto."
'@

# push_to_github.sh
write-file 'push_to_github.sh' @'
#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Uso: ./push_to_github.sh <git_remote_url> [branch]"
  exit 1
fi

REMOTE=$1
BRANCH=${2:-main}

if [ ! -d .git ]; then
  echo "Repositório git não inicializado. Rode ./init_repo.sh primeiro."
  exit 1
fi

# Remove origem antiga se existir
git remote remove origin 2>/dev/null || true

git remote add origin "$REMOTE"

git branch -M "$BRANCH"

git push -u origin "$BRANCH"

echo "Push concluído para $REMOTE (branch $BRANCH)."
'@

# push_to_github.ps1
write-file 'push_to_github.ps1' @'
param(
  [Parameter(Mandatory=$true)] [string]$RemoteUrl,
  [string]$Branch = 'main'
)

if (-not (Test-Path -Path .git)) {
  Write-Error "Repositório git não inicializado. Rode ./init_repo.sh primeiro."
  exit 1
}

try{
  git remote remove origin -ErrorAction SilentlyContinue
}catch{}

git remote add origin $RemoteUrl

git branch -M $Branch

git push -u origin $Branch
Write-Host "Push concluído para $RemoteUrl (branch $Branch)."
'@

# apply_repo_init_commit.sh
write-file 'apply_repo_init_commit.sh' @'
#!/usr/bin/env bash
set -e

# Script para adicionar uma entrada automática no CHANGELOG.md e commitar
# Uso: ./apply_repo_init_commit.sh

if [ ! -d .git ]; then
  echo "Erro: repositório git não inicializado. Rode ./init_repo.sh primeiro."
  exit 1
fi

CHANGELOG=CHANGELOG.md
DATE=$(date -u +"%Y-%m-%d")
ENTRY="- ${DATE}: Repo initialized (automated entry)."

# Garantir CHANGELOG.md existe
if [ ! -f "${CHANGELOG}" ]; then
  echo "# CHANGELOG" > "${CHANGELOG}"
  echo "" >> "${CHANGELOG}"
fi

# Evitar duplicatas
if grep -F "${ENTRY}" "${CHANGELOG}" >/dev/null 2>&1; then
  echo "Entrada já presente no CHANGELOG. Nada a fazer."
  exit 0
fi

# Inserir entrada no topo (após título) para manter histórico recente no começo
TMP=$(mktemp)
{
  head -n 1 "${CHANGELOG}"
  echo ""
  echo "## ${DATE}"
  echo "${ENTRY}"
  echo ""
  tail -n +2 "${CHANGELOG}"
} > "$TMP"

mv "$TMP" "${CHANGELOG}"

# Commitar mudança
git add "${CHANGELOG}"
if git commit -m "chore: repo initialized (automated changelog entry)"; then
  echo "CHANGELOG.md commitado com sucesso."
else
  echo "Nenhuma mudança para commitar ou erro ao commitar."
fi

echo "Pronto." 
'@

# apply_repo_init_commit.ps1
write-file 'apply_repo_init_commit.ps1' @'
param()

if (-not (Test-Path -Path .git)) {
  Write-Error "Erro: repositório git não inicializado. Rode init_repo.sh primeiro."
  exit 1
}

$changelog = "CHANGELOG.md"
$date = (Get-Date).ToString('yyyy-MM-dd')
$entry = "- $date: Repo initialized (automated entry)."

if (-not (Test-Path $changelog)) {
  "# CHANGELOG" | Out-File $changelog -Encoding UTF8
  "" | Out-File $changelog -Append -Encoding UTF8
}

$content = Get-Content $changelog -Raw
if ($content -like "*$entry*") {
  Write-Host "Entrada já presente no CHANGELOG. Nada a fazer."
  exit 0
}

# Inserir bloco no topo
$new = "# CHANGELOG`n`n## $date`n$entry`n`n" + ($content -replace "^# CHANGELOG[\r\n]+","")
$new | Out-File $changelog -Encoding UTF8

git add $changelog
try{
  git commit -m "chore: repo initialized (automated changelog entry)"
  Write-Host "CHANGELOG.md commitado com sucesso."
}catch{
  Write-Host "Nenhuma mudança para commitar ou erro ao commitar."
}

Write-Host "Pronto."'@

# GIT_INSTRUCTIONS.md
write-file 'GIT_INSTRUCTIONS.md' @'
# Git Instructions

## Inicializar repositório local

1. Torne o script executável (Unix):

   chmod +x init_repo.sh

2. Execute:

   ./init_repo.sh

## Inserir entrada automática no CHANGELOG e commitar

- Unix:

  chmod +x apply_repo_init_commit.sh
  ./apply_repo_init_commit.sh

- PowerShell:

  .\apply_repo_init_commit.ps1

## Publicar no GitHub (push)

- Unix (script):

  ./push_to_github.sh git@github.com:seuuser/seurepo.git main

- PowerShell:

  .\push_to_github.ps1 -RemoteUrl git@github.com:seuuser/seurepo.git -Branch main

Notas:

- Os scripts assumem que você já tenha SSH configurado (chave pública no GitHub) ou use uma URL HTTPS.
- Se usar HTTPS, o script pedirá suas credenciais (ou utilize um token).
- Caso precise, ajuste a branch (padrão: main).
'@

# .github workflow
write-file '.github/workflows/node-ci.yml' @'
name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run lint (placeholder)
        run: echo "No lint configured"
'@

Write-Host "Estrutura criada em: $dest"
Write-Host "Execute: cd `"$dest`" e siga GIT_INSTRUCTIONS.md para inicializar e publicar."
