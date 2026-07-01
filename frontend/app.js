const button = document.getElementById('analyzeBtn')
const exportJsonButton = document.getElementById('exportJsonBtn')
const printButton = document.getElementById('printBtn')
const themeToggle = document.getElementById('themeToggle')
const symbolInput = document.getElementById('symbol')
const statusBox = document.getElementById('status')
const assetTabsBox = document.getElementById('assetTabs')
const resultBox = document.getElementById('result')
const summaryBox = document.getElementById('summary')
const intelligenceBox = document.getElementById('intelligence')
const gitBox = document.getElementById('git')
const newsBox = document.getElementById('news')
const comparisonBox = document.getElementById('comparison')
const tabButtons = Array.from(document.querySelectorAll('[data-tab]'))
const tabPanels = Array.from(document.querySelectorAll('[data-panel]'))

const THEME_KEY = 'market-agents-theme'

const state = {
  jobs: [],
  selectedId: null,
  activeTab: 'summary',
  pollers: new Map()
}

button.addEventListener('click', analyze)
exportJsonButton.addEventListener('click', exportJson)
printButton.addEventListener('click', () => window.print())
themeToggle.addEventListener('click', toggleTheme)
symbolInput.addEventListener('keydown', event => {
  if(event.key === 'Enter') analyze()
})

tabButtons.forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab))
})

assetTabsBox.addEventListener('click', event => {
  const tab = event.target.closest('[data-job-id]')
  if(!tab) return
  state.selectedId = tab.dataset.jobId
  renderAll()
})

initTheme()
renderAll()

async function analyze(){
  const items = parseSymbols(symbolInput.value)

  if(items.length === 0){
    statusBox.innerText = 'Digite um símbolo (ex: BTC) ou cole uma URL do GitHub (ex: https://github.com/bitcoin/bitcoin).'
    return
  }

  clearPollers()
  state.jobs = []
  state.selectedId = null
  button.disabled = true
  exportJsonButton.disabled = true
  printButton.disabled = true
  statusBox.innerText = `Criando ${items.length} análise(s)...`
  clearResultBoxes()

  const created = await Promise.all(items.map(item => createJob(item)))
  state.jobs = created
  state.selectedId = created[0]?.id || null
  renderAll()

  const processing = created.filter(job => job.status === 'processing')
  if(processing.length === 0){
    button.disabled = false
    updateRunStatus()
    return
  }

  processing.forEach(job => startPolling(job.id))
  updateRunStatus()
}

// item = { type:'symbol', value:'BTC' } | { type:'repo', value:'bitcoin/bitcoin', label:'bitcoin/bitcoin' }
async function createJob(item){
  const isRepo = item.type === 'repo'
  const displayLabel = isRepo ? item.label : item.value
  const body = isRepo ? { repo: item.value } : { symbol: item.value }

  try{
    const response = await fetch('/jobs', {
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify(body)
    })

    const data = await response.json()

    if(!response.ok){
      throw new Error(data.error || 'Erro ao criar job')
    }

    return {
      id: data.id,
      symbol: displayLabel,
      isRepo,
      status: 'processing',
      created_at: new Date().toISOString()
    }
  }catch(error){
    return {
      id: `local-${displayLabel}-${Date.now()}`,
      symbol: displayLabel,
      isRepo,
      status: 'error',
      error: error.message
    }
  }
}

function startPolling(id){
  const tick = async () => {
    try{
      const response = await fetch('/jobs/' + id)
      const data = await response.json()

      if(!response.ok){
        throw new Error(data.error || 'Erro ao consultar job')
      }

      updateJob(data)

      if(data.status === 'finished' || data.status === 'error'){
        stopPolling(id)
      }

      updateRunStatus()
      renderAll()
    }catch(error){
      updateJob({
        id,
        status: 'error',
        error: error.message
      })
      stopPolling(id)
      updateRunStatus()
      renderAll()
    }
  }

  state.pollers.set(id, setInterval(tick, 2000))
  tick()
}

function stopPolling(id){
  const interval = state.pollers.get(id)
  if(interval) clearInterval(interval)
  state.pollers.delete(id)
}

function clearPollers(){
  state.pollers.forEach(interval => clearInterval(interval))
  state.pollers.clear()
}

function updateJob(nextJob){
  const index = state.jobs.findIndex(job => job.id === nextJob.id)
  if(index < 0) return
  state.jobs[index] = {
    ...state.jobs[index],
    ...nextJob,
    symbol: nextJob.symbol || state.jobs[index].symbol
  }
}

function updateRunStatus(){
  const processing = state.jobs.filter(job => job.status === 'processing').length
  const finished = state.jobs.filter(job => job.status === 'finished').length
  const errors = state.jobs.filter(job => job.status === 'error').length

  if(processing > 0){
    statusBox.innerText = `Processando ${processing}; concluídos ${finished}; erros ${errors}.`
    return
  }

  button.disabled = false
  exportJsonButton.disabled = state.jobs.length === 0
  printButton.disabled = state.jobs.length === 0
  statusBox.innerText = state.jobs.length > 0
    ? `Análises concluídas: ${finished}; erros: ${errors}.`
    : ''
}

function renderAll(){
  setActiveTab(state.activeTab, false)
  renderAssetTabs()
  renderComparison()

  const job = getSelectedJob()
  if(!job){
    renderEmptyState()
    return
  }

  if(job.status === 'error'){
    renderErrorState(job)
    return
  }

  if(job.status !== 'finished' || !job.result){
    renderPendingState(job)
    return
  }

  renderResult(job)
}

function clearResultBoxes(){
  summaryBox.innerHTML = ''
  intelligenceBox.innerHTML = ''
  gitBox.innerHTML = ''
  newsBox.innerHTML = ''
  comparisonBox.innerHTML = ''
  resultBox.innerText = ''
  assetTabsBox.innerHTML = ''
}

function renderEmptyState(){
  summaryBox.innerHTML = '<article class="metric tone-info"><span>Status</span><strong>Aguardando</strong></article>'
  intelligenceBox.innerHTML = ''
  gitBox.innerHTML = ''
  newsBox.innerHTML = ''
  resultBox.innerText = ''
}

function renderPendingState(job){
  summaryBox.innerHTML = `
    ${renderMetric('Símbolo', job.symbol, 'tone-info', 'Ativo em processamento.')}
    ${renderMetric('Status', 'processando', 'tone-info', 'Os agentes ainda estão executando.')}
  `
  intelligenceBox.innerHTML = ''
  gitBox.innerHTML = ''
  newsBox.innerHTML = ''
  resultBox.innerText = JSON.stringify(job, null, 2)
}

function renderErrorState(job){
  summaryBox.innerHTML = `
    ${renderMetric('Símbolo', job.symbol || '-', 'tone-danger', 'Ativo que falhou.')}
    ${renderMetric('Erro', job.error || 'Erro desconhecido', 'tone-danger', 'Mensagem retornada pelo job.')}
  `
  intelligenceBox.innerHTML = ''
  gitBox.innerHTML = ''
  newsBox.innerHTML = ''
  resultBox.innerText = JSON.stringify(job, null, 2)
}

function renderAssetTabs(){
  if(state.jobs.length === 0){
    assetTabsBox.innerHTML = ''
    return
  }

  assetTabsBox.innerHTML = state.jobs.map(job => `
    <button class="asset-tab ${job.id === state.selectedId ? 'is-active' : ''}" type="button" data-job-id="${escapeAttribute(job.id)}">
      <span class="asset-dot ${escapeAttribute(job.status || 'processing')}"></span>
      ${escapeHtml(job.symbol || job.result?.coin?.symbol || 'Ativo')}
    </button>
  `).join('')
}

function renderResult(job){
  const result = job.result
  const sentiment = result.sentiment || { score: 0 }
  const coin = result.coin || { symbol: job.symbol, news: [] }
  const filtered = result.filtered || []
  const translated = result.translated || filtered
  const risk = result.risk || { level: 'unknown', counts: {} }
  const community = result.community || { counts: {} }
  const intelligence = result.intelligence || null
  const marketIntel = intelligence?.market_intelligence || null
  const gitSummary = getTopGitSignal(result.git)
  const spamCount = (result.spamChecked || []).filter(item => item?.spam?.is_spam).length
  const confidence = intelligence ? Math.round(Number(intelligence.confidence || 0) * 100) : null

  summaryBox.innerHTML = [
    renderMetric('Símbolo', coin.symbol, 'tone-info', 'Ativo analisado.'),
    renderMetric('Notícias coletadas', coin.news.length, 'tone-neutral', 'Tamanho da amostra inicial.'),
    renderMetric('Notícias úteis', filtered.length, filtered.length >= 5 ? 'tone-success' : 'tone-warning', 'Itens que passaram no filtro de relevância.'),
    renderMetric('Spam bloqueado', spamCount, spamCount > 0 ? 'tone-warning' : 'tone-success', 'Itens marcados como spam antes da análise.'),
    renderMetric('Risco', risk.level, toneForRisk(risk.level), 'Leitura do Risk Agent.'),
    renderMetric('Score sentimento', sentiment.score, toneForSentiment(sentiment.score), 'Saldo simples entre notícias positivas e negativas.'),
    renderMetric('Contexto esperado', community.counts?.expected || 0, 'tone-neutral', 'Eventos parecidos com temas já esperados pela comunidade.'),
    renderMetric('Surpresas', community.counts?.surprise || 0, Number(community.counts?.surprise || 0) > 0 ? 'tone-warning' : 'tone-success', 'Eventos menos esperados.'),
    renderMetric('Git lead', gitSummary.lead_score, toneForGitSignal(gitSummary.market_signal), 'Força dos sinais de GitHub.'),
    renderMetric('Sinal Git', gitSummary.market_signal, toneForGitSignal(gitSummary.market_signal), 'Classificação agregada do Git Agent.'),
    renderMetric('Confiança', confidence === null ? '-' : `${confidence}%`, toneForConfidence(confidence), 'Confiança do Intelligence Agent.'),
    renderMetric('Segmento', intelligence?.market_state?.primary_segment || '-', 'tone-info', 'Tema dominante cruzando notícias, GitHub e perfil do ativo.'),
    renderMetric('Ciclo BTC', marketIntel?.btc_phase || '-', toneForCycle(marketIntel?.btc_phase), 'Fase estimada por dominância BTC e momentum.'),
    renderMetric('Altseason', marketIntel?.altseason_probability === null || marketIntel?.altseason_probability === undefined ? '-' : `${marketIntel.altseason_probability}%`, toneForAltseason(marketIntel?.altseason_probability), 'Probabilidade heurística de rotação para alts.'),
    renderMetric('Regime', marketIntel?.risk_regime || '-', toneForMarketRegime(marketIntel?.risk_regime), 'Leitura risk-on/risk-off agregada.')
  ].join('')

  renderIntelligence(intelligence)
  renderGitSignals(result.git)
  renderNews(translated)

  resultBox.innerText = JSON.stringify(result, null, 2)
}

function renderMetric(label, value, tone = 'tone-neutral', tooltip = ''){
  return `
    <article class="metric ${escapeAttribute(tone)}" title="${escapeAttribute(tooltip)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value ?? '-')}</strong>
    </article>
  `
}

function renderIntelligence(intelligence){
  if(!intelligence){
    intelligenceBox.innerHTML = ''
    return
  }

  const executive = intelligence.executive || {}
  const market = intelligence.market_state || {}
  const consensus = intelligence.consensus || {}
  const marketIntel = intelligence.market_intelligence || {}
  const segments = Array.isArray(intelligence.segments) ? intelligence.segments : []
  const metrics = Array.isArray(intelligence.metrics) ? intelligence.metrics : []
  const actions = Array.isArray(intelligence.action_plan) ? intelligence.action_plan : []
  const gitItems = Array.isArray(intelligence.git_intelligence?.top_items) ? intelligence.git_intelligence.top_items : []
  const newsItems = Array.isArray(intelligence.news_intelligence?.key_items) ? intelligence.news_intelligence.key_items : []
  const action = executive.actionability || intelligence.actionability

  intelligenceBox.innerHTML = `
    <article class="readout">
      <div class="readout-header">
        <div>
          <span class="section-kicker">Leitura executiva</span>
          <h2>${escapeHtml(executive.title || 'Análise inteligente')}</h2>
        </div>
        <span class="decision-pill ${escapeAttribute(toneForAction(action))}">${escapeHtml(formatAction(action))}</span>
      </div>
      <p class="verdict">${escapeHtml(executive.verdict || 'Sem veredito disponível.')}</p>
      <div class="readout-grid">
        ${renderMiniStat('Fase', market.phase || 'mixed')}
        ${renderMiniStat('Viés', market.bias || 'neutral')}
        ${renderMiniStat('Confiança', `${Math.round(Number(intelligence.confidence || 0) * 100)}%`)}
        ${renderMiniStat('Consenso', consensus.alignment || 'mixed')}
      </div>
      ${renderTextList(executive.readout, 'readout-list')}
    </article>

    <article class="market-board">
      <div class="section-title">
        <span class="section-kicker">Fase 2 · Market Cycle</span>
        <h2>Ciclo, rotação e saúde do ativo</h2>
      </div>
      <div class="market-grid">
        ${renderMarketTile('Ciclo BTC', marketIntel.btc_phase, marketIntel.btc_interpretation, toneForCycle(marketIntel.btc_phase))}
        ${renderMarketTile('Altseason', marketIntel.altseason_probability === null || marketIntel.altseason_probability === undefined ? '-' : `${marketIntel.altseason_probability}%`, marketIntel.alt_interpretation, toneForAltseason(marketIntel.altseason_probability))}
        ${renderMarketTile('Regime', marketIntel.risk_regime, marketIntel.risk_interpretation, toneForMarketRegime(marketIntel.risk_regime))}
        ${renderMarketTile('Saúde do ativo', marketIntel.target_health, marketIntel.target_interpretation, toneForTargetHealth(marketIntel.target_health))}
      </div>
      ${renderRotationStrip(marketIntel.sector_rotation)}
    </article>

    <article class="segment-board">
      <div class="section-title">
        <span class="section-kicker">Segmentos capturados</span>
        <h2>Onde o sinal está aparecendo</h2>
      </div>
      ${renderSegmentBars(segments)}
      <div class="segment-grid">
        ${segments.slice(0, 6).map(renderSegment).join('')}
      </div>
    </article>

    <article class="explain-board">
      <div class="section-title">
        <span class="section-kicker">O que é o que</span>
        <h2>Métricas explicadas</h2>
      </div>
      <div class="explain-grid">
        ${metrics.map(renderMetricExplanation).join('')}
      </div>
    </article>

    <article class="consensus-board">
      <div class="section-title">
        <span class="section-kicker">Consensus Engine</span>
        <h2>Como os agentes estão discordando ou confirmando</h2>
      </div>
      <div class="consensus-columns">
        ${renderEvidence('A favor', consensus.positive)}
        ${renderEvidence('Contra / risco', consensus.negative)}
        ${renderEvidence('Conflitos úteis', consensus.conflicts)}
      </div>
      <div class="action-strip">
        ${actions.map(actionItem => `
          <section>
            <span>${escapeHtml(actionItem.title)}</span>
            <p>${escapeHtml(actionItem.body)}</p>
          </section>
        `).join('')}
      </div>
    </article>

    <article class="signal-board">
      <div class="section-title">
        <span class="section-kicker">Sinais principais</span>
        <h2>GitHub e notícias que merecem leitura</h2>
      </div>
      <div class="signal-columns">
        <section>
          <h3>GitHub</h3>
          ${renderSignalCards(gitItems, 'Nenhum sinal técnico dominante.')}
        </section>
        <section>
          <h3>Notícias</h3>
          ${renderNewsSignals(newsItems, 'Nenhuma notícia forte na amostra.')}
        </section>
      </div>
    </article>
  `
}

function renderGitSignals(git){
  const entries = Object.entries(git || {})
    .filter(([, value]) => value && typeof value === 'object')
    .sort(([, a], [, b]) => Number(b.lead_score || b.top?.score || 0) - Number(a.lead_score || a.top?.score || 0))

  if(entries.length === 0){
    gitBox.innerHTML = ''
    return
  }

  gitBox.innerHTML = entries.map(([key, repo]) => {
    if(repo.error){
      return `
        <article class="git-repo">
          <div class="git-header">
            <h3>${escapeHtml(key)} · ${escapeHtml(repo.repo || 'GitHub')}</h3>
            <span class="status-pill tone-danger">indisponível</span>
          </div>
          <p>${escapeHtml(repo.error)}</p>
        </article>
      `
    }

    const difficulties = Array.isArray(repo.difficulties) ? repo.difficulties : []
    const successes = Array.isArray(repo.successes) ? repo.successes : []
    const forks = Array.isArray(repo.forks?.top) ? repo.forks.top : []

    return `
      <article class="git-repo">
        <div class="git-header">
          <h3>${escapeHtml(key)} · ${escapeHtml(repo.repo || repo.repository?.name || 'GitHub')}</h3>
          <span class="status-pill ${escapeAttribute(toneForGitSignal(repo.market_signal))}">${escapeHtml(repo.market_signal || 'quiet')}</span>
        </div>
        <div class="git-meta">
          <span>Score: ${escapeHtml(repo.lead_score ?? repo.top?.score ?? 0)}</span>
          <span>Forks: ${escapeHtml(repo.forks?.total ?? repo.repository?.forks ?? 0)}</span>
          <span>Forks ativos: ${escapeHtml(repo.forks?.active_recently ?? 0)}</span>
          <span>PRs abertos: ${escapeHtml(repo.issue_activity?.open_pull_requests ?? 0)}</span>
        </div>
        <p>${escapeHtml(repo.signal_summary || 'Sem sinal forte no GitHub agora.')}</p>
        ${repo.top ? `<p class="git-top">Commit topo: <a href="${escapeAttribute(repo.top.url)}" target="_blank" rel="noreferrer">${escapeHtml(repo.top.message || repo.top.short_sha)}</a></p>` : ''}
        <div class="git-columns">
          <section>
            <h4>Dificuldades</h4>
            ${renderSignalList(difficulties, 'Nenhuma dificuldade forte na amostra.')}
          </section>
          <section>
            <h4>Acertos</h4>
            ${renderSignalList(successes, 'Nenhum acerto forte na amostra.')}
          </section>
        </div>
        ${forks.length ? `
          <div class="fork-row">
            ${forks.slice(0, 4).map(fork => `
              <a href="${escapeAttribute(fork.url)}" target="_blank" rel="noreferrer">
                ${escapeHtml(fork.name)} · ★ ${escapeHtml(fork.stars)}
              </a>
            `).join('')}
          </div>
        ` : ''}
      </article>
    `
  }).join('')
}

function renderNews(translated){
  if(translated.length === 0){
    newsBox.innerHTML = '<p class="empty">Nenhuma notícia passou pelo filtro atual.</p>'
    return
  }

  newsBox.innerHTML = translated.map(item => `
    <article class="news-item ${escapeAttribute(toneForRisk(item.risk?.level || 'low'))}">
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

function renderComparison(){
  if(state.jobs.length === 0){
    comparisonBox.innerHTML = ''
    return
  }

  comparisonBox.innerHTML = `
    <article class="comparison-board">
      <div class="section-title">
        <span class="section-kicker">Comparação lado a lado</span>
        <h2>Ativos na mesma janela de leitura</h2>
      </div>
      <div class="comparison-grid">
        ${state.jobs.map(renderCompareCard).join('')}
      </div>
    </article>
  `
}

function renderCompareCard(job){
  if(job.status === 'error'){
    return `
      <section class="compare-card tone-danger">
        <h3>${escapeHtml(job.symbol || 'Ativo')}</h3>
        <dl>
          <dt>Status</dt><dd>erro</dd>
          <dt>Mensagem</dt><dd>${escapeHtml(job.error || '-')}</dd>
        </dl>
      </section>
    `
  }

  if(job.status !== 'finished' || !job.result){
    return `
      <section class="compare-card tone-info">
        <h3>${escapeHtml(job.symbol || 'Ativo')}</h3>
        <dl>
          <dt>Status</dt><dd>processando</dd>
        </dl>
      </section>
    `
  }

  const result = job.result
  const intelligence = result.intelligence || {}
  const marketIntel = intelligence.market_intelligence || {}
  const gitSummary = getTopGitSignal(result.git)
  const confidence = Math.round(Number(intelligence.confidence || 0) * 100)
  const filtered = Array.isArray(result.filtered) ? result.filtered.length : 0
  const tone = toneForMarketRegime(marketIntel.risk_regime)

  return `
    <section class="compare-card ${escapeAttribute(tone)}">
      <h3>${escapeHtml(result.coin?.symbol || job.symbol)}</h3>
      <dl>
        <dt>Regime</dt><dd>${escapeHtml(marketIntel.risk_regime || '-')}</dd>
        <dt>Confiança</dt><dd>${escapeHtml(confidence)}%</dd>
        <dt>Risco</dt><dd>${escapeHtml(result.risk?.level || '-')}</dd>
        <dt>Git lead</dt><dd>${escapeHtml(gitSummary.lead_score)}</dd>
        <dt>Sentimento</dt><dd>${escapeHtml(result.sentiment?.score ?? '-')}</dd>
        <dt>Notícias úteis</dt><dd>${escapeHtml(filtered)}</dd>
        <dt>Segmento</dt><dd>${escapeHtml(intelligence.market_state?.primary_segment || '-')}</dd>
      </dl>
    </section>
  `
}

function renderSignalList(items, emptyText){
  if(!items.length){
    return `<p class="empty-mini">${escapeHtml(emptyText)}</p>`
  }

  return `
    <ul class="signal-list">
      ${items.slice(0, 4).map(item => `
        <li>
          ${item.url ? `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title || item.message || item.type || 'sinal')}</a>` : escapeHtml(item.title || item.message || item.type || 'sinal')}
          ${item.terms?.length ? `<span>${escapeHtml(item.terms.join(', '))}</span>` : ''}
        </li>
      `).join('')}
    </ul>
  `
}

function renderMiniStat(label, value){
  return `
    <div class="mini-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `
}

function renderTextList(items, className){
  const values = Array.isArray(items) ? items.filter(Boolean) : []
  if(values.length === 0) return ''

  return `
    <ul class="${escapeAttribute(className)}">
      ${values.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `
}

function renderSegment(segment){
  return `
    <section class="segment-item">
      <div class="segment-head">
        <h3>${escapeHtml(segment.label)}</h3>
        <span>${escapeHtml(segment.stance)}</span>
      </div>
      <div class="segment-score">
        <strong>${escapeHtml(segment.score)}</strong>
        <span>${Math.round(Number(segment.confidence || 0) * 100)}%</span>
      </div>
      <p>${escapeHtml(segment.interpretation || segment.description || '')}</p>
      ${renderTextList(segment.why, 'compact-list')}
    </section>
  `
}

function renderSegmentBars(segments){
  const items = Array.isArray(segments) ? segments.slice(0, 6) : []
  if(items.length === 0) return '<p class="empty-mini">Nenhum segmento dominante ainda.</p>'

  const max = Math.max(...items.map(segment => Number(segment.score || 0)), 1)

  return `
    <div class="segment-chart">
      ${items.map(segment => {
        const percent = Math.max(4, Math.round((Number(segment.score || 0) / max) * 100))
        return `
          <div class="segment-bar" title="${escapeAttribute(segment.interpretation || segment.description || '')}">
            <span>${escapeHtml(segment.label)}</span>
            <div class="segment-track"><div class="segment-fill" style="--bar-width:${escapeAttribute(percent)}%"></div></div>
            <strong>${escapeHtml(segment.score)}</strong>
          </div>
        `
      }).join('')}
    </div>
  `
}

function renderMarketTile(label, value, text, tone = 'tone-info'){
  return `
    <section class="market-tile ${escapeAttribute(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || '-')}</strong>
      <p>${escapeHtml(text || 'Sem leitura de mercado disponível.')}</p>
    </section>
  `
}

function renderRotationStrip(rotation){
  const items = Array.isArray(rotation) ? rotation : []
  if(items.length === 0){
    return '<p class="empty-mini">Rotação setorial indisponível.</p>'
  }

  return `
    <div class="rotation-strip">
      ${items.slice(0, 6).map(item => `
        <span>
          ${escapeHtml(item.sector)} · ${escapeHtml(item.average_7d)}% · ${escapeHtml(item.strength)}
        </span>
      `).join('')}
    </div>
  `
}

function renderMetricExplanation(metric){
  return `
    <section class="explain-item quality-${escapeAttribute(classToken(metric.quality || 'ok'))}">
      <div>
        <span>${escapeHtml(metric.label)}</span>
        <strong>${escapeHtml(metric.value)}</strong>
      </div>
      <p>${escapeHtml(metric.meaning)}</p>
    </section>
  `
}

function renderEvidence(title, items){
  const values = Array.isArray(items) ? items : []
  return `
    <section>
      <h3>${escapeHtml(title)}</h3>
      ${values.length ? renderTextList(values.slice(0, 5), 'compact-list') : '<p class="empty-mini">Sem evidência forte.</p>'}
    </section>
  `
}

function renderSignalCards(items, emptyText){
  if(!items.length){
    return `<p class="empty-mini">${escapeHtml(emptyText)}</p>`
  }

  return `
    <div class="signal-card-list">
      ${items.slice(0, 5).map(item => `
        <article class="signal-card impact-${escapeAttribute(classToken(item.impact_level || 'low'))}">
          <div>
            <span>${escapeHtml(item.category || item.kind || 'sinal')}</span>
            <strong>${item.url ? `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</strong>
          </div>
          <p>${escapeHtml(item.meaning || '')}</p>
        </article>
      `).join('')}
    </div>
  `
}

function renderNewsSignals(items, emptyText){
  if(!items.length){
    return `<p class="empty-mini">${escapeHtml(emptyText)}</p>`
  }

  return `
    <div class="signal-card-list">
      ${items.slice(0, 5).map(item => `
        <article class="signal-card">
          <div>
            <span>${escapeHtml(item.source || 'fonte')}</span>
            <strong>${item.url ? `<a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</strong>
          </div>
          <p>Utilidade ${escapeHtml(item.usefulness)} · risco ${escapeHtml(item.risk)} · contexto ${escapeHtml(item.context)}</p>
        </article>
      `).join('')}
    </div>
  `
}

function setActiveTab(name, render = true){
  state.activeTab = name || 'summary'
  tabButtons.forEach(tab => {
    const active = tab.dataset.tab === state.activeTab
    tab.classList.toggle('is-active', active)
    tab.setAttribute('aria-selected', active ? 'true' : 'false')
  })

  tabPanels.forEach(panel => {
    panel.classList.toggle('is-active', panel.dataset.panel === state.activeTab)
  })

  if(render) renderAll()
}

function getSelectedJob(){
  return state.jobs.find(job => job.id === state.selectedId) || state.jobs[0] || null
}

function parseSymbols(value){
  const raw = String(value || '').trim()
  if(!raw) return []

  const seen = new Set()
  const result = []

  // Split on whitespace or commas/semicolons, but keep full URLs intact
  const parts = raw.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean)

  for(const part of parts){
    // Detect GitHub URLs or bare owner/repo patterns
    const githubMatch = part.match(
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?(?:\/.*)?$/i
    ) || part.match(
      /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/
    )

    if(githubMatch){
      const repoPath = githubMatch[1].replace(/\.git$/i, '')
      if(!seen.has(repoPath)){
        seen.add(repoPath)
        result.push({ type: 'repo', value: repoPath, label: repoPath })
      }
    } else {
      const sym = part.toUpperCase().replace(/[^A-Z0-9._-]/g, '')
      if(sym && !seen.has(sym)){
        seen.add(sym)
        result.push({ type: 'symbol', value: sym, label: sym })
      }
    }

    if(result.length >= 6) break
  }

  return result
}

function exportJson(){
  const payload = state.jobs.length > 1 ? state.jobs : getSelectedJob()
  if(!payload) return

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const suffix = state.jobs.map(job => job.symbol).filter(Boolean).join('-') || 'analysis'
  link.href = url
  link.download = `market-agents-${suffix}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || 'dark'
  document.body.dataset.theme = saved
  updateThemeButton()
}

function toggleTheme(){
  const next = document.body.dataset.theme === 'light' ? 'dark' : 'light'
  document.body.dataset.theme = next
  localStorage.setItem(THEME_KEY, next)
  updateThemeButton()
}

function updateThemeButton(){
  themeToggle.innerText = document.body.dataset.theme === 'light' ? 'Escuro' : 'Claro'
}

function toneForRisk(value){
  const level = String(value || '').toLowerCase()
  if(level === 'high') return 'tone-danger'
  if(level === 'medium') return 'tone-warning'
  if(level === 'low') return 'tone-success'
  return 'tone-neutral'
}

function toneForSentiment(value){
  const score = Number(value || 0)
  if(score > 0) return 'tone-success'
  if(score < 0) return 'tone-danger'
  return 'tone-neutral'
}

function toneForConfidence(value){
  if(value === null || value === undefined) return 'tone-neutral'
  const confidence = Number(value)
  if(confidence >= 75) return 'tone-success'
  if(confidence >= 45) return 'tone-warning'
  return 'tone-danger'
}

function toneForGitSignal(value){
  const signal = String(value || '').toLowerCase()
  if(signal.includes('strong')) return 'tone-success'
  if(signal.includes('watch')) return 'tone-warning'
  if(signal.includes('unavailable')) return 'tone-danger'
  return 'tone-neutral'
}

function toneForMarketRegime(value){
  const regime = String(value || '').toLowerCase()
  if(regime === 'risk_off') return 'tone-danger'
  if(regime === 'risk_on' || regime === 'selective_risk_on') return 'tone-success'
  if(regime.includes('defensive') || regime.includes('selective')) return 'tone-warning'
  return 'tone-neutral'
}

function toneForCycle(value){
  const phase = String(value || '').toLowerCase()
  if(phase.includes('risk_off') || phase.includes('drawdown')) return 'tone-danger'
  if(phase.includes('expansion') || phase.includes('rotation')) return 'tone-success'
  if(phase.includes('cooling') || phase.includes('range')) return 'tone-warning'
  return 'tone-neutral'
}

function toneForAltseason(value){
  const probability = Number(value || 0)
  if(probability >= 70) return 'tone-success'
  if(probability >= 45) return 'tone-warning'
  return 'tone-neutral'
}

function toneForTargetHealth(value){
  const status = String(value || '').toLowerCase()
  if(status === 'strong') return 'tone-success'
  if(status === 'fragile') return 'tone-danger'
  if(status === 'neutral') return 'tone-warning'
  return 'tone-neutral'
}

function toneForAction(value){
  const action = String(value || '').toLowerCase()
  if(action.includes('caution') || action.includes('defensive')) return 'tone-danger'
  if(action.includes('research') || action.includes('separate')) return 'tone-warning'
  if(action.includes('watch') || action.includes('monitor')) return 'tone-success'
  return 'tone-info'
}

function formatAction(value){
  const labels = {
    research_more: 'Pesquisar mais',
    caution_watch_git: 'Cautela + Git',
    caution: 'Cautela',
    separate_noise_from_signal: 'Separar ruído',
    market_defensive: 'Mercado defensivo',
    watch_rotation: 'Monitorar rotação',
    watch: 'Monitorar',
    monitor: 'Monitorar'
  }

  return labels[value] || value || 'Monitorar'
}

function getTopGitSignal(git){
  const entries = Object.values(git || {}).filter(value => value && typeof value === 'object' && !value.error)
  const best = entries.reduce((selected, item) => {
    const score = Number(item.lead_score ?? item.top?.score ?? 0)
    if(!selected || score > selected.lead_score){
      return {
        lead_score: score,
        market_signal: item.market_signal || 'unknown'
      }
    }
    return selected
  }, null)

  return best || { lead_score: 0, market_signal: 'unavailable' }
}

function classToken(value){
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-')
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
