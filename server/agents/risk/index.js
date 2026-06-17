const highRiskTerms = [
  'exploit',
  'hack',
  'hacked',
  'lawsuit',
  'rug pull',
  'scam',
  'sec charges',
  'stolen'
]

const mediumRiskTerms = [
  'bear',
  'crackdown',
  'investigation',
  'outage',
  'regulation',
  'volatility',
  'warning'
]

export function assessRisk(news = [], sentiment = { score: 0 }){
  const suspicious = news.filter(item => item?.spam?.is_spam).length
  const level = (sentiment.score < -1 || suspicious > 3) ? 'high' : (sentiment.score < 0 ? 'medium' : 'low')
  return { level, news, reason: `sentiment=${sentiment.score}, suspicious=${suspicious}` }
}

function normalizeText(value){
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function scoreContext(context){
  if(!context) return 0
  if(context.emphasis === 'increased') return 1
  if(context.emphasis === 'reduced') return -1
  return 0
}
