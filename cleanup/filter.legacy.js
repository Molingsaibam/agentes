// ...conteúdo movido de 'const blacklist = [.js' para cleanup...
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
