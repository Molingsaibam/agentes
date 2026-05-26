import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import morgan from 'morgan'

import { collectCoinData } from './collector/index.js'
import { filterNews } from './filter/index.js'
import { sentimentAnalysis } from './sentiment/index.js'
import { validateSecurity } from './security/index.js'
import { detectSpam } from './spam/index.js'
import { assessRisk } from './risk/index.js'
import { translateNews } from './translator/index.js'
import { analyzeCommunityContext } from './community/index.js'

dotenv.config()

const agentName = process.env.AGENT_NAME || process.argv[2]
const defaultPorts = {
  security: 3101,
  collector: 3102,
  filter: 3103,
  sentiment: 3104,
  spam: 3105,
  risk: 3106,
  translator: 3107,
  community: 3108
}

if(!agentName || !defaultPorts[agentName]){
  console.error('Set AGENT_NAME to one of: security, collector, filter, sentiment, spam, risk, translator, community')
  process.exit(1)
}

const app = express()
const port = process.env.AGENT_PORT || defaultPorts[agentName]

app.use(cors())
app.use(helmet())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

// Request validation
app.use((req, res, next) => {
  if (req.is('application/json') && req.get('content-length') > 2 * 1024 * 1024) {
    return res.status(413).json({ error: 'payload too large' })
  }
  next()
})

// Health check endpoint
app.get('/health', (req,res)=>{
  res.json({
    status:'online',
    agent: agentName,
    timestamp: new Date().toISOString()
  })
})

// Agent execution endpoint
app.post('/run', async (req,res)=>{
  try{
    const result = await runAgent(agentName, req.body || {})

    res.json({
      agent: agentName,
      status:'finished',
      result
    })
  }catch(error){
    res.status(500).json({
      agent: agentName,
      status:'error',
      error: error?.message || 'unknown error'
    })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    agent: agentName,
    status: 'error',
    error: 'internal server error'
  })
})

app.listen(port, ()=>{
  console.log(`${agentName} agent online on port ${port}`)
})

async function runAgent(name, payload){
  if(name === 'security'){
    return validateSecurity(payload.symbol)
  }

  if(name === 'collector'){
    return collectCoinData(payload.symbol)
  }

  if(name === 'filter'){
    return filterNews(payload.news)
  }

  if(name === 'spam'){
    return detectSpam(payload.news)
  }

  if(name === 'risk'){
    return assessRisk(payload.news, payload.sentiment)
  }

  if(name === 'sentiment'){
    return sentimentAnalysis(payload.news)
  }

  if(name === 'translator'){
    return translateNews(payload.news)
  }

  if(name === 'community'){
    return analyzeCommunityContext(payload.symbol, payload.news)
  }

  throw new Error(`unknown agent: ${name}`)
}
