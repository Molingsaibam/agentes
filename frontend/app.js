const button = document.getElementById('analyzeBtn')
const symbolInput = document.getElementById('symbol')
const statusBox = document.getElementById('status')
const resultBox = document.getElementById('result')
const summaryBox = document.getElementById('summary')
const newsBox = document.getElementById('news')

button.addEventListener('click', analyze)
symbolInput.addEventListener('keydown', event => {
  if(event.key === 'Enter') analyze()
})

async function analyze(){
  const symbol = symbolInput.value.trim().toUpperCase()

  if(!symbol){
    statusBox.innerText = 'Digite um símbolo para analisar.'
    return
  }

  button.disabled = true
  statusBox.innerText = 'Processando agentes...'
  resultBox.innerText = ''
  summaryBox.innerHTML = ''
  newsBox.innerHTML = ''

  try{
    const response = await fetch('/jobs', {
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({ symbol })
    })

    const data = await response.json()

    if(!response.ok){
      throw new Error(data.error || 'Erro ao criar job')
    }

    poll(data.id)
  }catch(error){
    button.disabled = false
    statusBox.innerText = error.message
  }
}

async function poll(id){
  const interval = setInterval(async () => {
    try{
      const response = await fetch('/jobs/' + id)
      const data = await response.json()

      if(!response.ok){
        throw new Error(data.error || 'Erro ao consultar job')
      }

      statusBox.innerText = data.status

      if(data.status === 'finished'){
        clearInterval(interval)
        button.disabled = false
        renderResult(data)
      }

      if(data.status === 'error'){
        clearInterval(interval)
        button.disabled = false
        resultBox.innerText = data.error
      }
    }catch(error){
      clearInterval(interval)
      button.disabled = false
      statusBox.innerText = error.message
    }
  }, 2000)
}

function renderResult(job){
  const result = job.result
  const sentiment = result.sentiment
  const coin = result.coin
  const filtered = result.filtered || []
  const translated = result.translated || filtered
  const risk = result.risk || { level: 'unknown', counts: {} }
  const community = result.community || { counts: {} }
  const spamCount = (result.spamChecked || []).filter(item => item?.spam?.is_spam).length

  summaryBox.innerHTML = `
    <article class="metric">
      <span>Símbolo</span>
      <strong>${escapeHtml(coin.symbol)}</strong>
    </article>
    <article class="metric">
      <span>Notícias coletadas</span>
      <strong>${coin.news.length}</strong>
    </article>
    <article class="metric">
      <span>Notícias úteis</span>
      <strong>${filtered.length}</strong>
    </article>
    <article class="metric">
      <span>Spam bloqueado</span>
      <strong>${spamCount}</strong>
    </article>
    <article class="metric">
      <span>Risco</span>
      <strong>${escapeHtml(risk.level)}</strong>
    </article>
    <article class="metric">
      <span>Score sentimento</span>
      <strong>${sentiment.score}</strong>
    </article>
    <article class="metric">
      <span>Contexto esperado</span>
      <strong>${community.counts?.expected || 0}</strong>
    </article>
    <article class="metric">
      <span>Surpresas</span>
      <strong>${community.counts?.surprise || 0}</strong>
    </article>
  `

  if(translated.length === 0){
    newsBox.innerHTML = '<p class="empty">Nenhuma notícia passou pelo filtro atual.</p>'
  }else{
    newsBox.innerHTML = translated.map(item => `
      <article class="news-item">
        <div class="news-meta">
          <span>Risco: ${escapeHtml(item.risk?.level || 'baixo')}</span>
          <span>Utilidade: ${escapeHtml(item.useful?.score ?? '-')}</span>
          <span>Contexto: ${escapeHtml(item.context?.emphasis || 'normal')}</span>
          <span>Tradução: ${escapeHtml(item.translated?.mode || 'local')}</span>
        </div>
        <h3>${escapeHtml(item.translated?.title || item.title || 'Sem título')}</h3>
        <p>${escapeHtml(item.translated?.body || item.body || 'Sem resumo disponível.')}</p>
        ${item.useful?.reasons?.length ? `<p class="reasons">${escapeHtml(item.useful.reasons.join(' | '))}</p>` : ''}
        <details>
          <summary>Original em inglês</summary>
          <h4>${escapeHtml(item.title || 'Sem título')}</h4>
          <p>${escapeHtml(item.body || 'Sem resumo disponível.')}</p>
        </details>
        ${item.url ? `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">Abrir fonte</a>` : ''}
      </article>
    `).join('')
  }

  resultBox.innerText = JSON.stringify(result, null, 2)
}

function escapeHtml(value){
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeAttribute(value){
  return escapeHtml(value).replaceAll('`', '&#096;')
}
