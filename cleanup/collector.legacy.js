// ...conteúdo movido de 'import axios from \'axios\'.js' para cleanup...
import axios from 'axios'
import fs from 'fs'
import path from 'path'

export async function collectCoinData(symbol){
  try{
    const url = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN`
    const response = await axios.get(url)
    const payload = response && response.data ? response.data : null

    // Debug: salvar payload bruto quando habilitado via env COLLECTOR_DEBUG=1
    if(process.env.COLLECTOR_DEBUG === '1'){
      try{
        const logsDir = path.join(process.cwd(), 'server', 'logs')
        if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
        const fname = `collector-${Date.now()}.json`
        const out = { symbol, fetched_at: new Date().toISOString(), payload }
        fs.writeFileSync(path.join(logsDir, fname), JSON.stringify(out, null, 2), 'utf8')
        console.log('collector: payload saved to', path.join('server','logs',fname))
      }catch(e){ console.warn('collector debug write failed', e && e.message) }
    }

    let news = []

    if(payload){
      // Caso normal (array)
      if(Array.isArray(payload.Data)){
        news = payload.Data.slice(0,15)
      }
      // Às vezes a API entrega um object com chaves
      else if(payload.Data && typeof payload.Data === 'object'){
        news = Object.values(payload.Data).slice(0,15)
      }
      // fallback para formatos inesperados
      else if(Array.isArray(payload)){
        news = payload.slice(0,15)
      }
    }

    // Normalizar itens (garantir título/url/body para frontend)
    news = news.map(item => {
      if(!item || typeof item !== 'object') return { title: String(item || ''), url: '', body: '' }
      return {
        title: item.title || item.headline || item.name || '',
        url: item.url || item.guid || item.source || '',
        body: item.body || item.description || item.summary || '',
        // manter resto dos campos
        ...item
      }
    })

    return {
      symbol,
      collected_at:new Date().toISOString(),
      news
    }
  }catch(e){
    console.warn('collectCoinData failed', e && e.message)
    return {
      symbol,
      collected_at:new Date().toISOString(),
      news: []
    }
  }
}
