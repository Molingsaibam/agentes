const spamTerms = [
  '100x',
  '1000x',
  'airdrop',
  'claim now',
  'double your',
  'free money',
  'guaranteed',
  'millionaire',
  'moonshot',
  'pump',
  'risk-free',
  'send crypto',
  'whatsapp'
]

export function detectSpam(news=[]){
  const items = Array.isArray(news) ? news : []

  return items.map(item => {
    const text = normalizeText(`${item?.title || ''} ${item?.body || ''}`)
    const matched_terms = spamTerms.filter(term => text.includes(term))
    const contextPenalty = item?.context?.novelty === 'surprise' && matched_terms.length > 0 ? 15 : 0
    const score = Math.min(100, matched_terms.length * 35 + contextPenalty)

    return {
      ...item,
      spam:{
        is_spam: score >= 35,
        score,
        context_penalty: contextPenalty,
        matched_terms
      }
    }
  })
}

function normalizeText(value){
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}
