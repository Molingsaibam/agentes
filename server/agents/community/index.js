const assetProfiles = {
  BTC: {
    name: 'Bitcoin',
    creator_status: 'decentralized',
    official: ['bitcoin.org', 'github.com/bitcoin/bitcoin'],
    community: ['bitcointalk.org', 'r/bitcoin'],
    expected_topics: ['etf', 'halving', 'mining', 'hashrate', 'macro', 'fed', 'treasury', 'quantum']
  },
  ETH: {
    name: 'Ethereum',
    creator_status: 'active-foundation',
    official: ['ethereum.org', 'blog.ethereum.org', 'github.com/ethereum'],
    community: ['ethereum-magicians.org', 'ethresear.ch', 'r/ethereum'],
    expected_topics: ['upgrade', 'staking', 'layer 2', 'l2', 'gas', 'validator', 'etf']
  },
  SOL: {
    name: 'Solana',
    creator_status: 'active-foundation',
    official: ['solana.com', 'github.com/solana-labs'],
    community: ['solana.com/community', 'r/solana'],
    expected_topics: ['outage', 'validator', 'throughput', 'memecoin', 'defi', 'firedancer']
  },
  XRP: {
    name: 'XRP',
    creator_status: 'company-linked',
    official: ['ripple.com', 'xrpl.org'],
    community: ['xrpl.org/community', 'r/ripple'],
    expected_topics: ['sec', 'lawsuit', 'settlement', 'payments', 'bank']
  },
  BNB: {
    name: 'BNB',
    creator_status: 'exchange-linked',
    official: ['bnbchain.org', 'binance.com'],
    community: ['forum.bnbchain.org', 'r/bnbchainofficial'],
    expected_topics: ['binance', 'burn', 'listing', 'regulation', 'exchange']
  },
  ADA: {
    name: 'Cardano',
    creator_status: 'active-foundation',
    official: ['cardano.org', 'iohk.io'],
    community: ['forum.cardano.org', 'r/cardano'],
    expected_topics: ['governance', 'hard fork', 'staking', 'treasury', 'research']
  }
}

const surpriseTerms = [
  'unexpected',
  'sudden',
  'halt',
  'exploit',
  'hack',
  'hacked',
  'stolen',
  'delist',
  'delisting',
  'lawsuit',
  'charges',
  'bankruptcy',
  'rug pull',
  'scam'
]

const expectedEventTerms = [
  'announced',
  'scheduled',
  'roadmap',
  'proposal',
  'governance',
  'upgrade',
  'unlock',
  'halving',
  'consultation',
  'review'
]

export function analyzeCommunityContext(symbol, news=[]){
  const normalizedSymbol = String(symbol || '').trim().toUpperCase()
  const profile = assetProfiles[normalizedSymbol] || buildUnknownProfile(normalizedSymbol)
  const items = Array.isArray(news) ? news : []
  const annotated = items.map(item => annotateNews(item, profile))
  const counts = summarize(annotated)

  return {
    symbol: normalizedSymbol,
    profile,
    counts,
    summary: buildSummary(profile, counts),
    news: annotated
  }
}

export function analyzeCommunityContextSimple(symbol, news = []){
  // Simples análise de palavra-chave para contar "expected" vs "surprise"
  const counts = { expected: 0, surprise: 0 }
  const expectedTerms = [ 'partnership', 'listing', 'etf', 'blackrock' ]

  const outNews = news.map(item => {
    const title = (item.title || '').toLowerCase()
    const isExpected = expectedTerms.some(t => title.includes(t))
    if(isExpected) counts.expected++
    else counts.surprise++
    return item
  })

  return { symbol, counts, news: outNews }
}

function annotateNews(item, profile){
  const text = normalizeText(`${item?.title || ''} ${item?.body || ''}`)
  const expectedMatches = findMatches(text, profile.expected_topics || [])
  const expectedEvents = findMatches(text, expectedEventTerms)
  const surpriseMatches = findMatches(text, surpriseTerms)
  const hasCreatorSignal = findCreatorSignal(text, profile)

  const novelty = surpriseMatches.length > 0 && expectedMatches.length === 0
    ? 'surprise'
    : expectedMatches.length > 0 || expectedEvents.length > 0
      ? 'expected'
      : 'unknown'

  const emphasis = novelty === 'expected'
    ? 'reduced'
    : novelty === 'surprise'
      ? 'increased'
      : 'normal'

  const creator_signal = hasCreatorSignal
    ? 'clear'
    : profile.creator_status === 'decentralized'
      ? 'decentralized'
      : 'silent'

  const reasons = []
  if(expectedMatches.length) reasons.push(`tema recorrente da comunidade: ${expectedMatches.join(', ')}`)
  if(expectedEvents.length) reasons.push(`evento comunicado/esperado: ${expectedEvents.join(', ')}`)
  if(surpriseMatches.length) reasons.push(`sinal de surpresa/risco: ${surpriseMatches.join(', ')}`)
  if(hasCreatorSignal) reasons.push('criador/fundacao/projeto citado na noticia')
  if(reasons.length === 0) reasons.push('sem contexto comunitario forte')

  return {
    ...item,
    context:{
      novelty,
      emphasis,
      community_alignment: novelty === 'expected' ? 'already_discussed' : novelty === 'surprise' ? 'news_led' : 'unknown',
      creator_signal,
      confidence: calculateConfidence(expectedMatches, expectedEvents, surpriseMatches, hasCreatorSignal),
      reasons
    }
  }
}

function buildUnknownProfile(symbol){
  return {
    name: symbol || 'Unknown asset',
    creator_status: 'unknown',
    official: [],
    community: [],
    expected_topics: ['airdrop', 'unlock', 'listing', 'delisting', 'hack', 'lawsuit', 'partnership', 'roadmap']
  }
}

function findCreatorSignal(text, profile){
  const officialNames = [
    profile.name,
    ...(profile.official || [])
  ]

  return officialNames.some(name => {
    const token = normalizeText(name).split(/[/.]/)[0]
    return token.length > 2 && text.includes(token)
  })
}

function calculateConfidence(expectedMatches, expectedEvents, surpriseMatches, hasCreatorSignal){
  const raw =
    expectedMatches.length * 0.18 +
    expectedEvents.length * 0.14 +
    surpriseMatches.length * 0.2 +
    (hasCreatorSignal ? 0.18 : 0)

  return Math.min(0.9, Math.max(0.35, Number(raw.toFixed(2))))
}

function summarize(news){
  return news.reduce((acc, item) => {
    const novelty = item.context?.novelty || 'unknown'
    const emphasis = item.context?.emphasis || 'normal'
    acc[novelty] = (acc[novelty] || 0) + 1
    acc[emphasis] = (acc[emphasis] || 0) + 1
    return acc
  }, { expected: 0, surprise: 0, unknown: 0, reduced: 0, increased: 0, normal: 0 })
}

function buildSummary(profile, counts){
  if(counts.surprise > counts.expected){
    return `${profile.name}: noticias recentes parecem trazer mais surpresa do que evento ja esperado.`
  }

  if(counts.expected > 0){
    return `${profile.name}: parte das noticias toca em temas ja acompanhados pela comunidade.`
  }

  return `${profile.name}: contexto comunitario ainda limitado para estas noticias.`
}

function findMatches(text, terms){
  return terms.filter(term => text.includes(normalizeText(term)))
}

function normalizeText(value){
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}
