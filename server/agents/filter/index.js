const blacklist = [
  '100x',
  '1000x',
  'airdrop',
  'claim now',
  'double your',
  'free money',
  'moon',
  'millionaire',
  'pump',
  'guaranteed',
  'risk-free',
  'send crypto',
  'whatsapp'
]

const marketPeople = [
  'arthur hayes',
  'brian armstrong',
  'cathie wood',
  'changpeng zhao',
  'cz',
  'donald trump',
  'elizabeth warren',
  'gary gensler',
  'jerome powell',
  'larry fink',
  'michael saylor',
  'paul tudor jones',
  'robert kiyosaki',
  'sam altman',
  'vitalik buterin'
]

const majorCompanies = [
  'a16z',
  'ark invest',
  'binance',
  'blackrock',
  'bybit',
  'coinbase',
  'fidelity',
  'goldman sachs',
  'grayscale',
  'jpmorgan',
  'mastercard',
  'meta',
  'microstrategy',
  'microsoft',
  'nasdaq',
  'paypal',
  'robinhood',
  'stripe',
  'tesla',
  'visa'
]

const institutions = [
  'bank of england',
  'boe',
  'cftc',
  'congress',
  'ecb',
  'federal reserve',
  'fed',
  'imf',
  'occ',
  'sec',
  'senate',
  'treasury',
  'white house'
]

const strongTopics = [
  'approval',
  'bankruptcy',
  'custody',
  'etf',
  'exploit',
  'hack',
  'institutional',
  'investigation',
  'lawsuit',
  'license',
  'liquidity',
  'listing',
  'merger',
  'partnership',
  'regulation',
  'reserve',
  'rwa',
  'security',
  'stablecoin',
  'tokenization'
]

const marketAssets = [
  'bitcoin',
  'btc',
  'ethereum',
  'eth',
  'solana',
  'sol',
  'xrp',
  'bnb',
  'stablecoin',
  'defi',
  'crypto'
]

export function filterNews(news=[]){
  const items = Array.isArray(news) ? news : []

  return items
    .map(item => ({
      ...item,
      useful: scoreNews(item)
    }))
    .filter(item => item.useful.keep)
    .sort((a, b) => b.useful.score - a.useful.score)
}

function scoreNews(item){
  if(item?.spam?.is_spam){
    return reject('spam detected')
  }

  const title = normalizeText(item?.title)
  const body = normalizeText(item?.body)
  const text = `${title} ${body}`

  if(title.length < 12){
    return reject('short title')
  }

  const blocked = blacklist.filter(term => text.includes(term))
  if(blocked.length > 0){
    return reject('blacklisted language', { blocked })
  }

  const signals = {
    people: findMatches(text, marketPeople),
    companies: findMatches(text, majorCompanies),
    institutions: findMatches(text, institutions),
    topics: findMatches(text, strongTopics),
    assets: findMatches(text, marketAssets),
    volume: findVolumeSignals(text),
    context: item?.context || null
  }

  const contextScore = scoreContext(item?.context)

  const score =
    signals.people.length * 3 +
    signals.companies.length * 3 +
    signals.institutions.length * 3 +
    signals.topics.length * 2 +
    signals.assets.length +
    signals.volume.length * 3 +
    contextScore

  const reasons = []

  if(signals.people.length) reasons.push(`pessoas relevantes: ${signals.people.join(', ')}`)
  if(signals.companies.length) reasons.push(`grandes empresas: ${signals.companies.join(', ')}`)
  if(signals.institutions.length) reasons.push(`instituicoes/reguladores: ${signals.institutions.join(', ')}`)
  if(signals.topics.length) reasons.push(`tema forte: ${signals.topics.join(', ')}`)
  if(signals.volume.length) reasons.push(`volume/valor alto: ${signals.volume.join(', ')}`)
  if(item?.context?.emphasis === 'increased') reasons.push('contexto aumentou a relevancia')
  if(item?.context?.emphasis === 'reduced') reasons.push('contexto reduziu a enfase da manchete')

  return {
    keep: score >= 4 && signals.assets.length > 0,
    score,
    reasons,
    signals
  }
}

function reject(reason, extra={}){
  return {
    keep:false,
    score:0,
    reasons:[reason],
    signals:{},
    ...extra
  }
}

function findMatches(text, terms){
  return terms.filter(term => text.includes(term))
}

function findVolumeSignals(text){
  const signals = []
  const moneyMatches = text.match(/\$?\d+(?:[.,]\d+)?\s?(?:billion|million|trillion|bn|m|b|k)/g) || []
  const percentMatches = text.match(/\d+(?:[.,]\d+)?\s?%/g) || []
  const largeNumberMatches = text.match(/\b\d{1,3}(?:,\d{3})+\b/g) || []

  signals.push(...moneyMatches)
  signals.push(...percentMatches)
  signals.push(...largeNumberMatches)

  return [...new Set(signals)].slice(0, 6)
}

function scoreContext(context){
  if(!context) return 0
  if(context.emphasis === 'increased') return 2
  if(context.emphasis === 'reduced') return -1
  return 0
}

function normalizeText(value){
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}
