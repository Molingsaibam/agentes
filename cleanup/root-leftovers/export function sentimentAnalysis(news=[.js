export function sentimentAnalysis(news=[]){

  let positive = 0
  let negative = 0

  news.forEach(item=>{

    const text = (item.title || '').toLowerCase()

    if(
      text.includes('growth') ||
      text.includes('bull') ||
      text.includes('partnership')
    ){
      positive++
    }

    if(
      text.includes('hack') ||
      text.includes('lawsuit') ||
      text.includes('bear')
    ){
      negative++
    }
  })

  return {
    positive,
    negative,
    score: positive - negative
  }
}
