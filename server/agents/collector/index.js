import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CRYPTOCOMPARE_URL = 'https://min-api.cryptocompare.com/data/v2/news/'
const RSS_FALLBACK_URL = 'https://cointelegraph.com/rss'
const SAMPLE_PATH = path.join(__dirname, 'sample_news.json')

export async function collectCoinData(symbol){
  const normalizedSymbol = String(symbol || '').trim().toUpperCase()

  // permitir forçar uso de sample via env
  const useSample = process.env.COLLECTOR_USE_SAMPLE === '1'

  if(useSample){
    try{
      const raw = fs.readFileSync(SAMPLE_PATH, 'utf8')
      const sample = JSON.parse(raw)
      return { symbol: normalizedSymbol, collected_at:new Date().toISOString(), news: sample }
    }catch(e){
      // fallback to empty
      return { symbol: normalizedSymbol, collected_at:new Date().toISOString(), news: [] }
    }
  }

  const payload = await collectNewsPayload(symbol)

  // Se payload sem notícias, tentar sample local antes de retornar vazio
  if(!payload || !Array.isArray(payload.news) || payload.news.length === 0){
    try{
      if(fs.existsSync(SAMPLE_PATH)){
        const raw = fs.readFileSync(SAMPLE_PATH, 'utf8')
        const sample = JSON.parse(raw)
        return { symbol: normalizedSymbol, source: 'sample', collected_at:new Date().toISOString(), news: sample }
      }
    }catch(err){ /* ignore */ }
  }

  if(process.env.COLLECTOR_DEBUG === '1'){
    saveDebugPayload(symbol, payload)
  }

  return {
    symbol: normalizedSymbol,
    source: payload.source,
    collected_at:new Date().toISOString(),
    news: payload.news
  }
}

async function collectNewsPayload(symbol){
  try{
    const news = await fetchCryptoCompareNews(symbol)
    if(news.length > 0){
      return { source: 'cryptocompare', news }
    }
  }catch(error){
    console.warn('CryptoCompare news unavailable:', error.message)
  }

  try{
    const news = await fetchRssNews(symbol)
    if(news.length > 0){
      return { source: 'cointelegraph-rss', news }
    }
  }catch(err){
    console.warn('RSS fallback failed:', err.message)
  }

  return { source: 'none', news: [] }
}

async function fetchCryptoCompareNews(){
  const params = { lang: 'EN' }

  if(process.env.CRYPTOCOMPARE_KEY){
    params.api_key = process.env.CRYPTOCOMPARE_KEY
  }

  const response = await axios.get(CRYPTOCOMPARE_URL, {
    params,
    timeout: 15000
  })
  const payload = response.data

  if(payload?.Response === 'Error'){
    throw new Error(payload.Message || 'CryptoCompare returned an error')
  }

  const rawNews = normalizeList(payload?.Data)

  return rawNews.slice(0, 15).map(normalizeNewsItem)
}

async function fetchRssNews(){
  const response = await axios.get(RSS_FALLBACK_URL, {
    responseType: 'text',
    timeout: 15000,
    headers: {
      Accept: 'application/rss+xml, text/xml, */*'
    }
  })

  const parser = new XMLParser({ ignoreAttributes: false })
  const parsed = parser.parse(response.data)
  const items = normalizeList(parsed?.rss?.channel?.item)

  return items.slice(0, 15).map(item => ({
    title: normalizeText(item.title),
    url: normalizeText(item.link),
    body: stripTags(normalizeText(item.description)),
    source: 'Cointelegraph'
  }))
}

function normalizeList(value){
  if(Array.isArray(value)) return value
  if(value && typeof value === 'object') return Object.values(value)
  return []
}

function normalizeNewsItem(item){
  if(!item || typeof item !== 'object'){
    return { title: String(item || ''), url: '', body: '' }
  }

  return {
    ...item,
    title: item.title || item.headline || item.name || '',
    url: item.url || item.guid || item.source || '',
    body: item.body || item.description || item.summary || ''
  }
}

function normalizeText(value){
  if(value === null || value === undefined) return ''
  if(typeof value === 'object') return normalizeText(value['#text'] || value._text || '')
  return String(value).trim()
}

function stripTags(value){
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function saveDebugPayload(symbol, payload){
  try{
    const logsDir = path.join(process.cwd(), 'server', 'logs')
    if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const fname = `collector-${Date.now()}.json`
    const out = { symbol, fetched_at: new Date().toISOString(), payload }
    fs.writeFileSync(path.join(logsDir, fname), JSON.stringify(out, null, 2), 'utf8')
  }catch(error){
    console.warn('collector debug write failed', error.message)
  }
}
