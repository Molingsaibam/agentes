import { collectCoinData } from './server/agents/collector/index.js'
import { filterNews } from './server/agents/filter/index.js'
import { sentimentAnalysis } from './server/agents/sentiment/index.js'
import { validateSecurity } from './server/agents/security/index.js'
import { analyzeCommunityContext } from './server/agents/community/index.js'

async function main(){
  const symbol = process.argv[2] || 'BTC'

  console.log('=== Teste de agentes para symbol =', symbol)

  try{
    console.log('\n-> Security:')
    const sec = await validateSecurity(symbol)
    console.log(sec)
  }catch(e){
    console.error('Security error:', e.message)
    process.exitCode = 1
    return
  }

  try{
    console.log('\n-> Collector: buscando noticias (pode demorar)...')
    const coin = await collectCoinData(symbol)
    console.log('Coletado:', coin.news.length, 'itens')

    console.log('\n-> Community: cruzando noticias com contexto do ativo')
    const community = analyzeCommunityContext(symbol, coin.news)
    console.log('Contexto:', community.counts, '-', community.summary)

    console.log('\n-> Filter: aplicando filtro')
    const filtered = filterNews(community.news)
    console.log('Apos filtro:', filtered.length, 'itens')

    console.log('\n-> Sentiment: analisando sentimento')
    const sentiment = sentimentAnalysis(filtered)
    console.log('Resultado sentiment:', sentiment)

  }catch(e){
    console.error('Erro ao executar agentes:', e && e.message)
    process.exitCode = 2
    return
  }

  console.log('\nTeste concluido.')
}

main()


