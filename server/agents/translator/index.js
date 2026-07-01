import axios from 'axios'

const dictionary = new Map([
  ['bitcoin', 'Bitcoin'],
  ['ethereum', 'Ethereum'],
  ['crypto', 'cripto'],
  ['cryptocurrency', 'criptomoeda'],
  ['market', 'mercado'],
  ['markets', 'mercados'],
  ['price', 'preço'],
  ['prices', 'preços'],
  ['trader', 'trader'],
  ['traders', 'traders'],
  ['investor', 'investidor'],
  ['investors', 'investidores'],
  ['fund', 'fundo'],
  ['funds', 'fundos'],
  ['etf', 'ETF'],
  ['spot', 'spot'],
  ['exchange', 'corretora'],
  ['exchanges', 'corretoras'],
  ['security', 'segurança'],
  ['hack', 'ataque hacker'],
  ['hacked', 'hackeado'],
  ['lawsuit', 'processo judicial'],
  ['regulation', 'regulação'],
  ['partnership', 'parceria'],
  ['listing', 'listagem'],
  ['growth', 'crescimento'],
  ['bull', 'alta'],
  ['bear', 'baixa'],
  ['rally', 'rali'],
  ['falls', 'cai'],
  ['rises', 'sobe'],
  ['launches', 'lança'],
  ['announces', 'anuncia'],
  ['after', 'após'],
  ['before', 'antes de'],
  ['with', 'com'],
  ['without', 'sem'],
  ['amid', 'em meio a'],
  ['as', 'enquanto'],
  ['new', 'novo'],
  ['major', 'grande'],
  ['global', 'global'],
  ['digital', 'digital'],
  ['asset', 'ativo'],
  ['assets', 'ativos'],
  ['token', 'token'],
  ['tokens', 'tokens'],
  ['ai', 'IA'],
  ['rwa', 'RWA']
])

export async function translateNews(news = []){
  // Placeholder: retorna as notícias sem alteração
  return news
}

async function translateText(value){
  const text = String(value || '').trim()
  if(!text) return { text:'', mode:'empty' }

  if(getTranslationMode() === 'mymemory'){
    try{
      return {
        text: await translateWithMyMemory(text),
        mode:'mymemory'
      }
    }catch(error){
      console.warn('translation fallback:', error.message)
    }
  }

  return {
    text: translateWithGlossary(text),
    mode:'local-glossary'
  }
}

async function translateWithMyMemory(text){
  const safeText = text.slice(0, 450)
  const response = await axios.get('https://api.mymemory.translated.net/get', {
    timeout: Number(process.env.TRANSLATION_TIMEOUT_MS || 8000),
    params:{
      q: safeText,
      langpair:'en|pt-BR'
    }
  })

  const translated = response.data?.responseData?.translatedText

  if(!translated || translated.toLowerCase() === safeText.toLowerCase()){
    throw new Error('empty translation response')
  }

  return translated
}

function translateWithGlossary(text){
  return text
    .split(/(\W+)/)
    .map(part => {
      const key = part.toLowerCase()
      const translated = dictionary.get(key)
      return translated || part
    })
    .join('')
}

function getTranslationMode(){
  return process.env.TRANSLATION_PROVIDER || 'mymemory'
}
