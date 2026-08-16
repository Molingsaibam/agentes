const gitHumanInput = document.getElementById('gitHumanInput')
const gitHumanTranslate = document.getElementById('gitHumanTranslate')
const gitHumanUseCurrent = document.getElementById('gitHumanUseCurrent')
const gitHumanSummary = document.getElementById('gitHumanSummary')
const gitHumanWall = document.getElementById('gitHumanWall')

const sampleGitSignals = [
  { message: 'fix mempool policy crash when orphan transaction is evicted', score: 78, files: 6, type: 'fix' },
  { message: 'refactor git lead scoring and btc accumulation range labels', score: 62, files: 11, type: 'refactor' },
  { message: 'docs update release notes for wallet descriptor migration', score: 24, files: 2, type: 'docs' }
]

gitHumanTranslate.addEventListener('click', renderGitHumanDashboard)
gitHumanUseCurrent.addEventListener('click', useCurrentGit)
renderGitHumanDashboard()

function useCurrentGit(){
  try{
    const job = window.marketAgentsGetSelectedJob?.()
    const git = job?.result?.git
    gitHumanInput.value = git ? JSON.stringify(git, null, 2) : ''
    renderGitHumanDashboard()
  }catch{
    renderGitHumanDashboard()
  }
}

function renderGitHumanDashboard(){
  const signals = parseGitSignals(gitHumanInput.value) || sampleGitSignals
  const top = signals[0] || {}
  const sentiment = scoreGitSentiment(signals)
  const dominant = detectGitSegment(signals)
  const avgScore = averageGit(signals.map(item => item.score))

  gitHumanSummary.innerHTML = [
    gitMetric('🧭 Sinal dominante', humanGitSignal(top), toneGitScore(top.score), 'Maior impacto técnico detectado.'),
    gitMetric('📈 Git lead', `${top.score || 0}/100`, toneGitScore(top.score), '0-39 baixo, 40-69 atenção, 70+ forte.'),
    gitMetric('💬 Sentimento', formatGitSentiment(sentiment), toneGitSentiment(sentiment), 'Saldo traduzido: negativo, neutro ou positivo.'),
    gitMetric('🏷️ Segmento', dominant, 'tone-info', 'Tema mais recorrente no conjunto de commits.'),
    gitMetric('🧱 Impacto médio', gitImpactLabel(avgScore), toneGitScore(avgScore), 'Média dos scores dos commits.'),
    gitMetric('🧪 Dificuldade', gitDifficultyLabel(signals), 'tone-warning', 'Estimativa baseada em arquivos alterados e termos técnicos.')
  ].join('')

  gitHumanWall.innerHTML = `
    <div class="section-title">
      <span class="section-kicker">GitHub sem muro de texto</span>
      <h2>O que esses commits significam?</h2>
    </div>
    <div class="legend">
      <span><b class="dot green"></b>Forte/positivo</span>
      <span><b class="dot yellow"></b>Atenção</span>
      <span><b class="dot red"></b>Risco alto</span>
    </div>
    ${signals.map(renderGitCommitCard).join('')}
  `
}

function parseGitSignals(text){
  if(!String(text || '').trim()) return null
  try{
    const data = JSON.parse(text)
    const list = Array.isArray(data) ? data : data.commits || data.items || data.signals || flattenGitObject(data)
    return list.map(normalizeGitSignal).filter(Boolean)
  }catch{
    return String(text).split('\n').map(line => line.trim()).filter(Boolean).map((message, index) => normalizeGitSignal({ message, score: Math.max(30, 80 - index * 9) }))
  }
}

function flattenGitObject(data){
  return Object.values(data || {}).flatMap(value => {
    if(Array.isArray(value)) return value
    if(value && typeof value === 'object'){
      const nested = value.top ? [value.top] : []
      return nested.concat(value.difficulties || [], value.successes || [])
    }
    return []
  })
}

function normalizeGitSignal(item){
  const message = item?.message || item?.title || item?.commit?.message || item?.subject || ''
  if(!message) return null
  return {
    message: String(message),
    score: Number(item.score ?? item.lead_score ?? item.impact ?? 45),
    files: Number(item.files ?? item.changed_files ?? item.files_changed ?? 1),
    type: item.type || detectGitType(message),
    url: item.url || item.html_url || ''
  }
}

function renderGitCommitCard(signal, index){
  const translated = translateGitCommit(signal)
  return `
    <details class="commit-card ${toneGitScore(signal.score)}" ${index === 0 ? 'open' : ''}>
      <summary>
        <span class="commit-rank">#${index + 1}</span>
        <strong>${escapeGitHtml(translated.title)}</strong>
        <em>${escapeGitHtml(gitImpactLabel(signal.score))}</em>
      </summary>
      <div class="commit-body">
        <p><b>O que foi feito:</b> ${escapeGitHtml(translated.fix)}</p>
        <p><b>Por que importa para o mercado:</b> ${escapeGitHtml(translated.market)}</p>
        <p><b>Dificuldade/impacto:</b> ${escapeGitHtml(translated.difficulty)}</p>
        <code>${escapeGitHtml(signal.message)}</code>
        ${signal.url ? `<a class="commit-link" href="${escapeGitAttribute(signal.url)}" target="_blank" rel="noreferrer">Abrir commit</a>` : ''}
      </div>
    </details>
  `
}

function translateGitCommit(signal){
  const message = String(signal.message || '')
  const type = detectGitType(message)
  const segment = detectGitSegment([signal])
  const fix = type === 'fix'
    ? 'Corrige uma falha que poderia afetar estabilidade, segurança ou confiança do usuário.'
    : type === 'docs'
      ? 'Melhora documentação e reduz incerteza para usuários e desenvolvedores.'
      : type === 'refactor'
        ? 'Reorganiza a implementação para melhorar manutenção, desempenho ou clareza.'
        : 'Adiciona ou modifica uma capacidade concreta do projeto.'
  const market = `Mostra atividade real em ${segment}. Isso ajuda a diferenciar desenvolvimento concreto de ruído social, mas não é uma recomendação de compra ou venda.`
  const difficulty = `${gitDifficultyLabel([signal])}; impacto ${gitImpactLabel(signal.score).toLowerCase()} pelo score ${signal.score || 0}/100.`
  return { title: humanGitSignal(signal), fix, market, difficulty }
}

function humanGitSignal(signal){
  const message = String(signal?.message || 'sinal técnico').replace(/[_-]/g, ' ')
  return message.split(/[.:]/)[0].slice(0, 88)
}

function detectGitType(message){
  const text = String(message).toLowerCase()
  if(/\bfix\b|crash|bug|security|vulnerability/.test(text)) return 'fix'
  if(/\bdoc\b|readme|release notes/.test(text)) return 'docs'
  if(/\brefactor\b|infra|cleanup|migration/.test(text)) return 'refactor'
  return 'feature'
}

function detectGitSegment(signals){
  const text = signals.map(item => item.message).join(' ').toLowerCase()
  if(/wallet|descriptor|address/.test(text)) return 'Carteira / UX'
  if(/mempool|transaction|block|fee|consensus|node/.test(text)) return 'Rede / transações'
  if(/git|infra|refactor|ci|test|build/.test(text)) return 'Dev / infraestrutura'
  if(/mining|hashrate|miner/.test(text)) return 'Mineração'
  return 'Core protocol'
}

function scoreGitSentiment(signals){
  return Math.max(-3, Math.min(3, Math.round(signals.reduce((sum, item) => sum + (detectGitType(item.message) === 'fix' ? -0.5 : 0.4), 0))))
}

function formatGitSentiment(score){
  return `${score} · ${score < 0 ? 'pressão/risco' : score > 0 ? 'positivo' : 'neutro'}`
}

function averageGit(values){
  return Math.round(values.reduce((a, b) => a + Number(b || 0), 0) / Math.max(values.length, 1))
}

function gitImpactLabel(score){
  return Number(score || 0) >= 70 ? 'Impacto alto' : Number(score || 0) >= 40 ? 'Impacto médio' : 'Impacto baixo'
}

function gitDifficultyLabel(signals){
  const avgFiles = averageGit(signals.map(item => item.files || 1))
  return avgFiles >= 8 ? 'Alta' : avgFiles >= 3 ? 'Média' : 'Baixa'
}

function toneGitScore(score){
  return Number(score || 0) >= 70 ? 'tone-success' : Number(score || 0) >= 40 ? 'tone-warning' : 'tone-neutral'
}

function toneGitSentiment(score){
  return score < 0 ? 'tone-danger' : score > 0 ? 'tone-success' : 'tone-neutral'
}

function gitMetric(label, value, tone, help){
  return `<article class="metric ${tone}"><span>${escapeGitHtml(label)}</span><strong>${escapeGitHtml(value)}</strong><small>${escapeGitHtml(help)}</small></article>`
}

function escapeGitHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]))
}

function escapeGitAttribute(value){
  return escapeGitHtml(value).replaceAll('`', '&#096;')
}
