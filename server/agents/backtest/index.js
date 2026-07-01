import { collectCoinData } from '../collector/index.js'
import { filterNews } from '../filter/index.js'
import { sentimentAnalysis } from '../sentiment/index.js'
import { assessRisk } from '../risk/index.js'

export async function runBacktests(tracked = { BTC: 'bitcoin/bitcoin', ETH: 'ethereum/go-ethereum' }){
  const out = {}

  for(const [symbol, repoOrPlaceholder] of Object.entries(tracked)){
    try{
      // usar symbol para coleta (collector ignora repo placeholder)
      const coin = await collectCoinData(symbol)
      const filtered = filterNews(coin.news)
      const sentiment = sentimentAnalysis(filtered)
      const risk = assessRisk(filtered, sentiment)

      // Simulação simples: capital inicial 1000, ROI percentual = clamp(score * 1.0, -50, +200)
      const capital = 1000
      const score = sentiment.score || 0
      let roiPercent = score * 1.0
      if(roiPercent > 200) roiPercent = 200
      if(roiPercent < -50) roiPercent = -50
      const final = capital * (1 + roiPercent / 100)

      out[symbol] = {
        total_news: coin.news.length,
        filtered_news: filtered.length,
        sentiment,
        risk,
        simulated: {
          capital,
          roiPercent,
          final
        }
      }

    }catch(e){
      out[symbol] = { error: e.message }
    }
  }

  return out
}

export default { runBacktests }
