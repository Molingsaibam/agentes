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
import gitAgent from './agents/gitAgent.js'
import { analyzeCommunityContext } from './agents/community/index.js'
import { listJobs, saveJob } from './database/store.js'
import { analyzeContract } from './agents/contractRisk/index.js'
import { analyzeIntelligence } from './agents/intelligence/index.js'
import { analyzeMarketCycle } from './agents/market/index.js'
import { runBacktests } from './agents/backtest/index.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(helmet())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

// Simple in-memory rate limiter (per IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30
const ipCounts = new Map()

// Clean up old IP entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of ipCounts.entries()) {
    if (now - entry.start > RATE_LIMIT_WINDOW_MS * 5) {
      ipCounts.delete(ip)
    }
  }
}, 5 * 60 * 1000)

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

// Request validation middleware
app.use((req, res, next) => {
  // Validate request body size
  if (req.is('application/json') && req.get('content-length') > 2 * 1024 * 1024) {
    return res.status(413).json({ error: 'payload too large' })
  }
  next()
})

// Serve frontend statically if present
const frontendPath = path.join(process.cwd(), 'frontend')
app.use(express.static(frontendPath))

const jobs = {}

const savedJobs = await listJobs(100)
savedJobs.forEach(job => {
  jobs[job.id] = job
})

app.get('/health', async (req, res) => {
  try{
    const agentNames = ['security','collector','spam','filter','risk','sentiment','translator','community','git','intelligence','market','backtest','etherscan']
    const checks = await Promise.all(agentNames.map(name => checkAgent(name, process.env[`${name.toUpperCase()}_AGENT_URL`])))

    const agents = {}
    checks.forEach(c => {
      const key = c && (c.name || c.agent) ? (c.name || c.agent) : 'unknown'
      agents[key] = {
        ok: !!c?.ok,
        status: c?.status || null,
        url: c?.url || null,
        error: c?.error || null,
        latency_ms: c?.latency_ms || null
      }
    })

    const serverInfo = {
      now: new Date().toISOString(),
      uptime_seconds: process.uptime(),
      node: process.version,
      env: { NODE_ENV: process.env.NODE_ENV || 'development' }
    }

    const overall = Object.values(agents).every(a => a.ok) ? 'ok' : 'degraded'

    // Add etherscan metrics from local client if available
    let etherscanMetrics = null
    try{
      const etherscanClient = await import('./utils/etherscan_client.js')
      if(etherscanClient && etherscanClient.getMetrics){
        etherscanMetrics = etherscanClient.getMetrics()
      }
    }catch(e){ /* ignore */ }

    const health = { status: overall, server: serverInfo, agents }
    if(etherscanMetrics) health.etherscan = etherscanMetrics

    res.json(health)
  }catch(err){
    res.status(500).json({ status: 'error', error: err.message })
  }
})

app.get('/agents', async (req,res)=>{
  const agentDefs = [
    { name: 'security',    url: process.env.SECURITY_AGENT_URL },
    { name: 'collector',   url: process.env.COLLECTOR_AGENT_URL },
    { name: 'spam',        url: process.env.SPAM_AGENT_URL },
    { name: 'filter',      url: process.env.FILTER_AGENT_URL },
    { name: 'risk',        url: process.env.RISK_AGENT_URL },
    { name: 'sentiment',   url: process.env.SENTIMENT_AGENT_URL },
    { name: 'translator',  url: process.env.TRANSLATOR_AGENT_URL },
    { name: 'community',   url: process.env.COMMUNITY_AGENT_URL },
    { name: 'git',         url: process.env.GIT_AGENT_URL },
    { name: 'intelligence',url: process.env.INTELLIGENCE_AGENT_URL },
    { name: 'market',      url: process.env.MARKET_AGENT_URL },
    { name: 'backtest',    url: process.env.BACKTEST_AGENT_URL }
  ]

  const agents = await Promise.all(agentDefs.map(({ name, url }) => checkAgent(name, url)))

  const online = agents.filter(a => a.ok).length
  const offline = agents.filter(a => !a.ok && a.mode === 'container').length

  res.json({
    agents,
    summary: {
      total: agents.length,
      online,
      offline,
      local: agents.filter(a => a.mode === 'local').length,
      degraded: offline > 0
    }
  })
})

app.get('/jobs', async (req,res)=>{
  const savedJobs = await listJobs(20)

  res.json({
    jobs: savedJobs.map(job => ({
      id: job.id,
      symbol: job.symbol,
      repo: job.repo || null,
      status: job.status,
      created_at: job.created_at,
      updated_at: job.updated_at,
      summary: job.summary || null,
      error: job.error || null
    }))
  })
})

// Test CMC via server proxy. Requires CMC_KEY in .env
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
  const requestedSymbol = normalizeSymbolInput(req.body?.symbol)
  const repo = normalizeRepoInput(req.body?.repo || req.body?.repository || req.body?.github_repo)

  if(!requestedSymbol && !repo){
    return res.status(400).json({
      error:'symbol or repo required'
    })
  }

  const repoOnly = !requestedSymbol && !!repo
  const symbol = requestedSymbol || inferSymbolFromRepo(repo)
  const id = uuid()
  const now = new Date().toISOString()

  jobs[id] = {
    id,
    symbol,
    repo: repo || null,
    status:'processing',
    created_at: now,
    updated_at: now
  }

  await saveJob(jobs[id])

  res.json({ id })

  try{
    const security = repoOnly
      ? { status:'secure', symbol, repo, checked_at:new Date().toISOString() }
      : await runAgent('security', { symbol }, () => validateSecurity(symbol))

    const coin = repoOnly
      ? buildEmptyCoin(symbol, repo)
      : await runAgent('collector', { symbol }, () => collectCoinData(symbol))

    const community = await runAgent('community', { symbol, news: coin.news }, () => analyzeCommunityContext(symbol, coin.news))

    const spamChecked = await runAgent('spam', { news: community.news }, async () => {
      const { detectSpam } = await import('./agents/spam/index.js')
      return detectSpam(community.news)
    })

    const filtered = await runAgent('filter', { news: spamChecked }, () => filterNews(spamChecked))

    const sentiment = await runAgent('sentiment', { news: filtered }, () => sentimentAnalysis(filtered))

    const risk = await runAgent('risk', { news: filtered, sentiment }, async () => {
      const { assessRisk } = await import('./agents/risk/index.js')
      return assessRisk(filtered, sentiment)
    })

    const translated = await runAgent('translator', { news: risk.news }, async () => {
      const { translateNews } = await import('./agents/translator/index.js')
      return translateNews(risk.news)
    })

    const market = repoOnly
      ? null
      : await runAgent('market', { symbol }, () => analyzeMarketCycle(symbol))

    const gitPayload = buildGitPayload(symbol, repo)
    const git = await runAgent('git', gitPayload, () => gitAgent.scanRepos(gitPayload))
    const gitSummary = summarizeGitResult(git)
    const contractRiskResults = analyzeContractsFromGit(git)

    const intelligencePayload = {
      symbol,
      repo: repo || null,
      security,
      coin,
      community,
      spamChecked,
      filtered,
      risk,
      sentiment,
      translated,
      market,
      git,
      contractRisk: contractRiskResults
    }
    const intelligence = await runAgent('intelligence', intelligencePayload, () => analyzeIntelligence(intelligencePayload))

    jobs[id] = {
      ...jobs[id],
      id,
      status:'finished',
      updated_at:new Date().toISOString(),
      summary:{
        total_news: coin.news.length,
        spam_news: spamChecked.filter(item => item?.spam?.is_spam).length,
        filtered_news: filtered.length,
        risk_level: risk.level,
        sentiment_score: sentiment.score,
        context_expected: community.counts.expected,
        context_surprise: community.counts.surprise,
        git_top_score: gitSummary.lead_score,
        git_market_signal: gitSummary.market_signal,
        git_repo: gitSummary.repo,
        git_difficulties: gitSummary.difficulties,
        git_successes: gitSummary.successes,
        git_top: gitSummary.top,
        market_phase: market?.btc_cycle?.phase || null,
        altseason_probability: market?.alt_cycle?.probability ?? null,
        risk_regime: market?.risk_regime?.regime || null,
        target_health: market?.target_health?.status || null,
        intelligence_action: intelligence?.actionability || null,
        intelligence_confidence: intelligence?.confidence ?? null,
        primary_segment: intelligence?.market_state?.primary_segment || null,
        contract_risk_count: Object.keys(contractRiskResults).length
      },
      result:{
        security,
        coin,
        community,
        spamChecked,
        filtered,
        risk,
        sentiment,
        translated,
        market,
        git,
        intelligence,
        contractRisk: contractRiskResults
      }
    }

    await saveJob(jobs[id])

  }catch(error){

    jobs[id] = {
      ...jobs[id],
      id,
      status:'error',
      error: error?.message || 'unknown error',
      updated_at:new Date().toISOString()
    }

    await saveJob(jobs[id])

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

// Nova rota para scan Git
app.post('/git/scan', async (req,res)=>{
  try{
    const repo = normalizeRepoInput(req.body?.repo || req.body?.repository)
    const payload = {
      tracked: req.body?.tracked || req.body?.repos,
      repo: repo || undefined,
      symbol: normalizeSymbolInput(req.body?.symbol),
      symbols: req.body?.symbols,
      commitLimit: req.body?.commitLimit
    }
    const result = await gitAgent.scanRepos(payload)
    res.json(result)
  }catch(e){
    res.status(500).json({ error: e.message })
  }
})

app.get('/backtest/run', async (req,res)=>{
  try{
    const tracked = buildTrackedFromSymbols(req.query.symbols || req.query.symbol || 'BTC,ETH')
    const result = await runAgent('backtest', { tracked, symbols: Object.keys(tracked) }, () => runBacktests(tracked))
    res.json(result)
  }catch(e){
    res.status(500).json({ error: e.message })
  }
})

// Nova rota para obter ABI de contrato via Etherscan
app.get('/etherscan/abi', async (req,res)=>{
  const address = (req.query.address || '').toString().trim()
  if(!address) return res.status(400).json({ error: 'address required' })
  try{
    const { getContractABI } = await import('./agents/etherscan/index.js')
    const result = await getContractABI(address)
    res.json(result)
  }catch(e){
    res.status(500).json({ error: e.message })
  }
})

// Nova rota para status dos agentes
app.get('/agents/status', async (req, res) => {
  try{
    const agentNames = ['security','collector','spam','filter','risk','sentiment','translator','community','git','intelligence','market','backtest','etherscan']
    const checks = await Promise.all(agentNames.map(name => checkAgent(name, process.env[`${name.toUpperCase()}_AGENT_URL`])))

    const errors = checks
      .filter(c => !c?.ok)
      .map(c => ({ agent: c?.name || c?.agent || 'unknown', error: c?.error || c?.status || 'unavailable', url: c?.url || null }))

    const status = errors.length === 0 ? 'all_agents_ok' : 'errors_present'

    res.json({ status, errors })
  }catch(err){
    res.status(500).json({ status: 'error', error: err.message })
  }
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


function normalizeSymbolInput(value){
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9._-]/g, '')
}

function normalizeRepoInput(value){
  const raw = String(value || '').trim()
  if(!raw) return ''

  const match = raw.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+\/[^/.#?]+)(?:\.git)?(?:[/?#].*)?$/i)
    || raw.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:\.git)?$/)

  return match ? match[1].replace(/\.git$/i, '') : ''
}

function inferSymbolFromRepo(repo){
  const known = {
    'bitcoin/bitcoin': 'BTC',
    'ethereum/go-ethereum': 'ETH',
    'solana-labs/solana': 'SOL',
    'smartcontractkit/chainlink': 'LINK',
    'zcash/zcash': 'ZEC',
    'ripple/rippled': 'XRP',
    'bnb-chain/bsc': 'BNB'
  }
  const normalized = String(repo || '').toLowerCase()
  if(known[normalized]) return known[normalized]

  return normalizeSymbolInput(String(repo || '').split('/').pop() || 'REPO').slice(0, 16) || 'REPO'
}

function buildEmptyCoin(symbol, repo){
  return {
    symbol,
    source: 'repo-only',
    repo,
    collected_at:new Date().toISOString(),
    news: []
  }
}

function buildGitPayload(symbol, repo){
  if(repo){
    return {
      symbol,
      repo,
      tracked: { [symbol || repo]: repo }
    }
  }

  return { symbol }
}

function buildTrackedFromSymbols(value){
  const known = {
    BTC: 'bitcoin/bitcoin',
    ETH: 'ethereum/go-ethereum',
    SOL: 'solana-labs/solana',
    LINK: 'smartcontractkit/chainlink',
    ZEC: 'zcash/zcash'
  }
  const values = Array.isArray(value) ? value : String(value || '').split(',')
  const symbols = values
    .flatMap(item => String(item || '').split(','))
    .map(normalizeSymbolInput)
    .filter(Boolean)

  return symbols.reduce((acc, symbol) => {
    acc[symbol] = known[symbol] || 'manual'
    return acc
  }, {})
}

function summarizeGitResult(git){
  const entries = Object.entries(git || {})
    .filter(([, value]) => value && typeof value === 'object')

  const best = entries.reduce((selected, [key, item]) => {
    const score = Number(item.lead_score ?? item.top?.score ?? 0)
    if(!selected || score > selected.lead_score){
      return {
        key,
        repo: item.repo || null,
        top: item.top || null,
        lead_score: score,
        market_signal: item.market_signal || (item.error ? 'unavailable' : 'quiet'),
        difficulties: Array.isArray(item.difficulties) ? item.difficulties.length : 0,
        successes: Array.isArray(item.successes) ? item.successes.length : 0
      }
    }
    return selected
  }, null)

  return best || {
    key: null,
    repo: null,
    top: null,
    lead_score: 0,
    market_signal: 'unavailable',
    difficulties: 0,
    successes: 0
  }
}

function analyzeContractsFromGit(git){
  const contractRiskResults = {}

  try{
    for(const [symbol, data] of Object.entries(git || {})){
      const recent = data?.recent || []
      for(const item of recent){
        for(const abiItem of item.abis || []){
          const abi = abiItem?.abiResult?.ok ? abiItem.abiResult.abi : null
          if(!abi) continue

          const key = abiItem.address || abiItem.file || `${symbol}-${item.sha}`
          try{
            contractRiskResults[key] = analyzeContract(abi, abiItem.address || null)
          }catch(error){
            contractRiskResults[key] = { error: error.message }
          }
        }
      }
    }
  }catch(error){
    console.warn('contract risk extraction failed:', error.message)
  }

  return contractRiskResults
}

function getAgentUrl(name){
  const key = `${name.toUpperCase()}_AGENT_URL`
  return process.env[key]
}

async function runAgent(name, payload, localHandler){
  const agentUrl = getAgentUrl(name)

  if(!agentUrl){
    return localHandler()
  }

  try{
    const response = await axios.post(`${agentUrl}/run`, payload, {
      timeout: Number(process.env.AGENT_TIMEOUT_MS || 30000)
    })

    if(response.data?.status === 'error'){
      throw new Error(response.data.error || `${name} agent failed`)
    }

    return response.data.result
  }catch(err){
    // fallback para handler local se remoto falhar
    console.warn(`Agent ${name} remote call failed, falling back to local handler:`, err.message)
    return localHandler()
  }
}

async function checkAgent(name, agentUrl){
  if(!agentUrl){
    return {
      name,
      mode: 'local',
      ok: true,
      status: 'available'
    }
  }

  const start = Date.now()
  try{
    const response = await axios.get(`${agentUrl}/health`, { timeout: 3000 })
    const latency_ms = Date.now() - start
    const data = response.data || {}

    return {
      name,
      mode: 'container',
      ok: true,
      status: data.status || 'online',
      version: data.version || null,
      uptime: data.uptime || null,
      memory: data.memory || null,
      latency_ms,
      url: agentUrl
    }
  }catch(error){
    return {
      name,
      mode: 'container',
      ok: false,
      status: 'offline',
      latency_ms: Date.now() - start,
      url: agentUrl,
      error: error.message
    }
  }
}
