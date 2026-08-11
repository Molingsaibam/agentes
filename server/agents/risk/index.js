export function assessRisk(news = [], sentiment = { score: 0 }){
  const suspicious = news.filter(item => item?.spam?.is_spam).length
  const level = (sentiment.score < -1 || suspicious > 3) ? 'high' : (sentiment.score < 0 ? 'medium' : 'low')
  return { level, news, reason: `sentiment=${sentiment.score}, suspicious=${suspicious}` }
}
