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

export function assessRisk(news=[], sentiment={ score: 0 }){
  const items = Array.isArray(news) ? news : []
  let high = 0
  let medium = 0
  let low = 0

  const annotated = items.map(item => {
    const text = normalizeText(`${item?.title || ''} ${item?.body || ''}`)
    const high_terms = highRiskTerms.filter(term => text.includes(term))
    const medium_terms = mediumRiskTerms.filter(term => text.includes(term))
    const contextAdjustment = scoreContext(item?.context)
    const score = Math.max(0, high_terms.length * 3 + medium_terms.length + contextAdjustment)
    const level = score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low'

    if(level === 'high') high++
    if(level === 'medium') medium++
    if(level === 'low') low++

    return {
      ...item,
      risk:{
        level,
        score,
        context_adjustment: contextAdjustment,
        high_terms,
        medium_terms
      }
    }
  })

  const sentimentPenalty = Number(sentiment?.score || 0) < 0 ? 1 : 0
  const globalScore = high * 3 + medium + sentimentPenalty
  const globalLevel = globalScore >= 6 ? 'high' : globalScore >= 2 ? 'medium' : 'low'

  return {
    level: globalLevel,
    score: globalScore,
    counts:{ high, medium, low },
    news: annotated
  }
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
