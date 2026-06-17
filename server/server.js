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
    const agentNames = ['security','collector','spam','filter','risk','sentiment','translator','community','git','etherscan']
    const checks = await Promise.all(agentNames.map(name => checkAgent(name, process.env[`${name.toUpperCase()}_AGENT_URL`])))

    const agents = {}
    checks.forEach(c => {
      const key = c && (c.name || c.agent) ? (c.name || c.agent) : 'unknown'
      agents[key] = {
        ok: !!c?.ok,
        status: c?.status || null,
        url: c?.url || null,
        error: c?.error || null,
        latency: c?.latency || null
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

    res.json({ status: overall, server: serverInfo, agents })
  }catch(err){
    res.status(500).json({ status: 'error', error: err.message })
  }
})

app.get('/agents', async (req,res)=>{
  const agents = await Promise.all([
    checkAgent('security', process.env.SECURITY_AGENT_URL),
    checkAgent('collector', process.env.COLLECTOR_AGENT_URL),
    checkAgent('spam', process.env.SPAM_AGENT_URL),
    checkAgent('filter', process.env.FILTER_AGENT_URL),
    checkAgent('risk', process.env.RISK_AGENT_URL),
    checkAgent('sentiment', process.env.SENTIMENT_AGENT_URL),
    checkAgent('translator', process.env.TRANSLATOR_AGENT_URL),
    checkAgent('community', process.env.COMMUNITY_AGENT_URL),
    checkAgent('git', process.env.GIT_AGENT_URL),
    checkAgent('etherscan', process.env.ETHERSCAN_AGENT_URL)
  ])

  res.json({ agents })
})

app.get('/jobs', async (req,res)=>{
  const savedJobs = await listJobs(20)

  res.json({
    jobs: savedJobs.map(job => ({
      id: job.id,
      symbol: job.symbol,
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
  const { symbol } = req.body

  if(!symbol){
    return res.status(400).json({
      error:'symbol required'
    })
  }

  const id = uuid()

  jobs[id] = {
    id,
    symbol,
    status:'processing',
    created_at:new Date().toISOString()
  }

  await saveJob(jobs[id])

  res.json({ id })

  try{

    const security = await runAgent('security', { symbol }, () => validateSecurity(symbol))

    const coin = await runAgent('collector', { symbol }, () => collectCoinData(symbol))

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

    // Executar Git Agent (local ou remoto)
    const git = await runAgent('git', { symbol }, () => gitAgent.scanRepos())

    // calcular métrica simples do git (maior score entre repos)
    let gitTopScore = 0
    let gitTop = null
    try{
      for(const [k,v] of Object.entries(git || {})){
        if(v && v.top && (v.top.score || 0) > gitTopScore){
          gitTopScore = v.top.score || 0
          gitTop = { key:k, repo:v.repo, top:v.top }
        }
      }
    }catch(e){ /* ignore parsing errors */ }

    // executar contract risk para ABIs encontrados no git result
    let contractRiskResults = {}
    try{
      const gitEntries = git || {}
      for(const [symbol, data] of Object.entries(gitEntries)){
        const recent = data.recent || []
        for(const item of recent){
          if(item.abis && Array.isArray(item.abis)){
            for(const a of item.abis){
              if(a.abiResult && a.abiResult.ok && a.abiResult.abi){
                try{
                  const ar = analyzeContract(a.abiResult.abi, a.address || null)
                  contractRiskResults[a.address || a.file || `${symbol}-${item.sha}`] = ar
                }catch(e){
                  contractRiskResults[a.address || a.file || `${symbol}-${item.sha}`] = { error: e.message }
                }
              }
            }
          }
        }
      }
    }catch(e){ /* ignore contract risk errors */ }

    jobs[id] = {
      ...jobs[id],
      id,
      status:'finished',
      summary:{
        total_news: coin.news.length,
        spam_news: spamChecked.filter(item => item?.spam?.is_spam).length,
        filtered_news: filtered.length,
        risk_level: risk.level,
        sentiment_score: sentiment.score,
        context_expected: community.counts.expected,
        context_surprise: community.counts.surprise,
        git_top_score: gitTopScore,
        git_top: gitTop,
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
        git,
        contractRisk: contractRiskResults
      }
    }

    await saveJob(jobs[id])

  }catch(error){

    jobs[id] = {
      ...jobs[id],
      id,
      status:'error',
      error: error?.message || 'unknown error'
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
  const tracked = req.body.tracked || undefined
  try{
    const result = await gitAgent.scanRepos(tracked)
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
    const agentNames = ['security','collector','spam','filter','risk','sentiment','translator','community','git','etherscan']
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

function getAgentMode(envName){
  return process.env[envName] ? 'container' : 'local'
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
      mode:'local',
      status:'available'
    }
  }

  try{
    const response = await axios.get(`${agentUrl}/health`, { timeout: 3000 })

    return {
      name,
      mode:'container',
      status: response.data?.status || 'unknown',
      url: agentUrl
    }
  }catch(error){
    return {
      name,
      mode:'container',
      status:'offline',
      url: agentUrl,
      error: error.message
    }
  }
}
