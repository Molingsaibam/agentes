export function sentimentAnalysis(news=[]){
  const items = Array.isArray(news) ? news : []

  let positive = 0
  let negative = 0

  items.forEach(item=>{
    const text = `${item?.title || ''} ${item?.body || ''}`.toLowerCase()

    if(
      text.includes('growth') ||
      text.includes('bull') ||
      text.includes('partnership') ||
      text.includes('rally') ||
      text.includes('approval')
    ){
      positive++
    }

    if(
      text.includes('hack') ||
      text.includes('lawsuit') ||
      text.includes('bear') ||
      text.includes('exploit') ||
      text.includes('scam')
    ){
      negative++
    }
  })

  return {
    positive,
    negative,
    total: items.length,
    score: positive - negative
  }
}
