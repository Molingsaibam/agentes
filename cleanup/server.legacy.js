// ...conteúdo movido de 'import express from \'express\'.js' para cleanup...
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
