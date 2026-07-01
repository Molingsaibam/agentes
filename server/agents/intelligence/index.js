const assetProfiles = {
  BTC: {
    name: 'Bitcoin',
    base_segments: ['bitcoin', 'macro_etf', 'mining', 'developer_infra'],
    role: 'reserva de valor, liquidez base e termometro do mercado cripto'
  },
  ETH: {
    name: 'Ethereum',
    base_segments: ['ethereum', 'l1_l2', 'defi', 'staking', 'developer_infra'],
    role: 'plataforma de contratos inteligentes, liquidez DeFi e infraestrutura para L2'
  },
  SOL: {
    name: 'Solana',
    base_segments: ['l1_l2', 'defi', 'memecoin', 'developer_infra'],
    role: 'L1 de alta performance com forte atividade de apps e varejo'
  },
  XRP: {
    name: 'XRP',
    base_segments: ['payments', 'regulation'],
    role: 'rede ligada a pagamentos e narrativa regulatoria'
  },
  BNB: {
    name: 'BNB',
    base_segments: ['exchange_cex', 'defi', 'l1_l2'],
    role: 'ativo de exchange/ecossistema com exposicao a BNB Chain'
  },
  ADA: {
    name: 'Cardano',
    base_segments: ['l1_l2', 'staking', 'governance', 'developer_infra'],
    role: 'L1 focada em governanca, staking e pesquisa'
  },
  LINK: {
    name: 'Chainlink',
    base_segments: ['oracle_data', 'rwa', 'defi'],
    role: 'infraestrutura de dados, oraculos e interoperabilidade institucional'
  },
  ZEC: {
    name: 'Zcash',
    base_segments: ['privacy_zk', 'payments', 'developer_infra'],
    role: 'privacidade, criptografia aplicada e pagamentos'
  }
}

const segmentCatalog = [
  {
    key: 'bitcoin',
    label: 'Bitcoin / reserva de valor',
    description: 'Sinais ligados a BTC como ativo principal, liquidez base e referencia de ciclo.',
    terms: ['bitcoin', 'btc', 'satoshi', 'lightning', 'ordinals']
  },
  {
    key: 'macro_etf',
    label: 'Macro / ETF / institucional',
    description: 'Fluxos institucionais, juros, reguladores, ETF, tesourarias e narrativa macro.',
    terms: ['etf', 'fed', 'treasury', 'institutional', 'blackrock', 'fidelity', 'nasdaq', 'macro', 'rate cut', 'rate hike', 'reserve', 'strategy', 'microstrategy']
  },
  {
    key: 'mining',
    label: 'Mineração / hash rate',
    description: 'Hash rate, mineradores, energia, halving e seguranca economica da rede.',
    terms: ['miner', 'mining', 'hashrate', 'hash rate', 'halving', 'difficulty adjustment']
  },
  {
    key: 'ethereum',
    label: 'Ethereum / staking',
    description: 'ETH, validadores, staking, gas, upgrades e ecossistema Ethereum.',
    terms: ['ethereum', 'eth', 'staking', 'validator', 'gas', 'eip', 'dencun', 'pectra']
  },
  {
    key: 'l1_l2',
    label: 'L1 / L2 / escalabilidade',
    description: 'Redes base, rollups, throughput, finality, upgrades e concorrencia de infraestrutura.',
    terms: ['layer 1', 'layer 2', 'l1', 'l2', 'rollup', 'throughput', 'mainnet', 'validator', 'upgrade', 'scaling']
  },
  {
    key: 'defi',
    label: 'DeFi / liquidez onchain',
    description: 'DEX, lending, TVL, stable pools, liquidacao e composabilidade financeira.',
    terms: ['defi', 'dex', 'tvl', 'liquidity', 'lending', 'yield', 'swap', 'aave', 'uniswap', 'curve']
  },
  {
    key: 'stablecoins',
    label: 'Stablecoins / pagamentos',
    description: 'USDT, USDC, emissao, reservas, pagamentos e trilhos de liquidacao.',
    terms: ['stablecoin', 'usdt', 'usdc', 'tether', 'circle', 'payments', 'settlement']
  },
  {
    key: 'ai_compute',
    label: 'AI / computação descentralizada',
    description: 'Narrativa de IA, GPUs, compute, agentes, dados e redes de infraestrutura para IA.',
    terms: ['ai', 'artificial intelligence', 'gpu', 'compute', 'render', 'bittensor', 'akash', 'agent']
  },
  {
    key: 'rwa',
    label: 'RWA / tokenização',
    description: 'Ativos do mundo real, treasuries tokenizados, fundos, credito privado e compliance.',
    terms: ['rwa', 'tokenization', 'tokenized', 'treasury', 'real world asset', 'blackrock bUIDL', 'fund']
  },
  {
    key: 'memecoin',
    label: 'Memecoin / especulação',
    description: 'Fluxo de varejo, alta volatilidade, hype e risco de reversao rapida.',
    terms: ['meme', 'memecoin', 'doge', 'shib', 'pepe', 'pump', 'moon']
  },
  {
    key: 'privacy_zk',
    label: 'Privacidade / ZK',
    description: 'Provas zero-knowledge, privacidade, criptografia e debates regulatórios.',
    terms: ['privacy', 'zk', 'zero knowledge', 'shielded', 'proof', 'zcash', 'tornado']
  },
  {
    key: 'oracle_data',
    label: 'Oráculos / dados',
    description: 'Feeds de preco, CCIP, mensageria cross-chain e dados externos para contratos.',
    terms: ['oracle', 'chainlink', 'ccip', 'data feed', 'price feed']
  },
  {
    key: 'exchange_cex',
    label: 'Exchanges / CEX',
    description: 'Binance, Coinbase, listagens, liquidez centralizada, compliance e risco operacional.',
    terms: ['binance', 'coinbase', 'kraken', 'bybit', 'okx', 'exchange', 'listing', 'delisting']
  },
  {
    key: 'regulation',
    label: 'Regulação / jurídico',
    description: 'SEC, CFTC, processos, licencas, fiscalizacao e mudanca de regras.',
    terms: ['sec', 'cftc', 'lawsuit', 'charges', 'regulation', 'regulatory', 'license', 'court', 'senate']
  },
  {
    key: 'security',
    label: 'Segurança / exploits',
    description: 'Hacks, exploits, bugs, incidentes, hardening e risco tecnico.',
    terms: ['hack', 'exploit', 'security', 'vuln', 'vulnerability', 'stolen', 'attack', 'crash']
  },
  {
    key: 'developer_infra',
    label: 'Dev / infraestrutura de código',
    description: 'Commits, releases, forks, PRs, refactors e saude de desenvolvimento.',
    terms: ['github', 'commit', 'release', 'pull request', 'merge', 'refactor', 'ci', 'test']
  },
  {
    key: 'governance',
    label: 'Governança / treasury',
    description: 'Votacoes, propostas, tesouraria, parametros e decisao comunitaria.',
    terms: ['governance', 'proposal', 'vote', 'treasury', 'dao']
  },
  {
    key: 'payments',
    label: 'Pagamentos / adoção',
    description: 'Uso transacional, bancos, comerciantes, remessas e trilhos de pagamento.',
    terms: ['payment', 'payments', 'bank', 'merchant', 'remittance', 'settlement']
  }
]

export function analyzeIntelligence(input = {}){
  const symbol = normalizeSymbol(input.symbol)
  const profile = assetProfiles[symbol] || buildUnknownProfile(symbol)
  const coin = input.coin || {}
  const risk = input.risk || {}
  const sentiment = input.sentiment || { score: 0 }
  const community = input.community || { counts: {} }
  const filtered = normalizeList(input.filtered)
  const translated = normalizeList(input.translated)
  const news = translated.length > 0 ? translated : filtered.length > 0 ? filtered : normalizeList(coin.news)
  const git = input.git || {}
  const market = input.market || null
  const gitIntel = buildGitIntelligence(git)
  const marketIntel = buildMarketIntelligence(market)
  const newsIntel = buildNewsIntelligence(news, coin)
  const segments = buildSegments({ symbol, profile, news, gitIntel, marketIntel, risk, sentiment })
  const marketState = inferMarketState({ symbol, profile, risk, sentiment, community, gitIntel, marketIntel, newsIntel, segments })
  const consensus = buildConsensus({ risk, sentiment, community, gitIntel, marketIntel, newsIntel, segments })
  const confidence = calculateConfidence({ coin, newsIntel, gitIntel, marketIntel, consensus })
  const actionability = decideActionability({ risk, sentiment, gitIntel, marketIntel, newsIntel, consensus, confidence })
  const executive = buildExecutive({ symbol, profile, marketState, consensus, actionability, confidence, segments, gitIntel, marketIntel, newsIntel })

  return {
    symbol,
    generated_at: new Date().toISOString(),
    executive,
    market_state: marketState,
    confidence,
    actionability,
    segments,
    market_intelligence: marketIntel,
    news_intelligence: newsIntel,
    git_intelligence: gitIntel,
    consensus,
    metrics: buildMetricExplanations({ coin, filtered, news, risk, sentiment, community, gitIntel, marketIntel, segments, confidence, actionability }),
    action_plan: buildActionPlan({ actionability, risk, sentiment, gitIntel, marketIntel, consensus, segments }),
    glossary: buildGlossary()
  }
}

function buildMarketIntelligence(market){
  if(!market){
    return {
      available: false,
      summary: 'Market Cycle ainda sem dados para esta execução.',
      btc_phase: 'unknown',
      alt_state: 'unknown',
      altseason_probability: null,
      risk_regime: 'unknown',
      target_health: 'unknown',
      target_score: 0,
      sector_rotation: [],
      metrics: []
    }
  }

  const altProbability = Number(market.alt_cycle?.probability ?? 0)
  const rotation = normalizeList(market.sector_rotation)

  return {
    available: market.source !== 'fallback' || normalizeList(market.errors).length === 0,
    source: market.source,
    summary: market.explanation || 'Market Cycle analisado.',
    btc_phase: market.btc_cycle?.phase || 'unknown',
    btc_interpretation: market.btc_cycle?.interpretation || '',
    btc_dominance: market.btc_cycle?.dominance ?? market.global?.btc_dominance ?? null,
    alt_state: market.alt_cycle?.state || 'unknown',
    alt_interpretation: market.alt_cycle?.interpretation || '',
    altseason_probability: altProbability,
    risk_regime: market.risk_regime?.regime || 'unknown',
    risk_interpretation: market.risk_regime?.interpretation || '',
    target_health: market.target_health?.status || 'unknown',
    target_score: Number(market.target_health?.score || 0),
    target_interpretation: market.target_health?.interpretation || '',
    target_reasons: normalizeList(market.target_health?.reasons),
    sector_rotation: rotation,
    strongest_rotation: rotation[0] || null,
    metrics: normalizeList(market.metrics),
    errors: normalizeList(market.errors)
  }
}

function buildGitIntelligence(git){
  const repos = Object.entries(git || {})
    .filter(([, repo]) => repo && typeof repo === 'object')
    .map(([key, repo]) => ({ key, ...repo }))

  const available = repos.filter(repo => !repo.error)
  const strongest = available
    .slice()
    .sort((a, b) => Number(b.lead_score || b.top?.score || 0) - Number(a.lead_score || a.top?.score || 0))[0] || null
  const topItems = []

  for(const repo of available){
    if(repo.top){
      topItems.push(normalizeGitItem('commit', repo.top, repo))
    }

    normalizeList(repo.difficulties).forEach(item => topItems.push(normalizeGitItem('difficulty', item, repo)))
    normalizeList(repo.successes).forEach(item => topItems.push(normalizeGitItem('success', item, repo)))
  }

  topItems.sort((a, b) => b.impact - a.impact)

  const leadScore = Number(strongest?.lead_score || strongest?.top?.score || 0)
  const errors = repos.flatMap(repo => normalizeList(repo.errors).map(error => ({ repo: repo.repo, ...error })))
  const signalQuality = errors.length > 0 && available.length === 0
    ? 'unavailable'
    : leadScore >= 45
      ? 'strong'
      : leadScore >= 18
        ? 'moderate'
        : 'weak'

  return {
    repo_count: repos.length,
    available_count: available.length,
    strongest_repo: strongest ? strongest.repo : null,
    lead_score: leadScore,
    market_signal: strongest?.market_signal || 'unavailable',
    signal_quality: signalQuality,
    summary: explainGitSummary(strongest, topItems, errors),
    top_items: topItems.slice(0, 10),
    forks: {
      total: Number(strongest?.forks?.total || strongest?.repository?.forks || 0),
      active_recently: Number(strongest?.forks?.active_recently || 0),
      top: normalizeList(strongest?.forks?.top).slice(0, 5)
    },
    pull_requests: {
      open: Number(strongest?.issue_activity?.open_pull_requests || 0),
      sampled: Number(strongest?.issue_activity?.sampled || 0)
    },
    errors
  }
}

function normalizeGitItem(kind, item, repo){
  const impactLevel = item.impact_level || inferImpactLevel(item.impact || item.score || 0)
  const title = item.title || item.message || item.type || 'Sinal Git'

  return {
    kind,
    repo: repo.repo,
    title,
    url: item.url || '',
    category: item.category || item.classification || kind,
    impact: Number(item.impact || item.score || 0),
    impact_level: impactLevel,
    meaning: item.meaning || explainGitItem(kind, title, impactLevel),
    terms: normalizeList(item.terms || item.difficulty_terms || item.success_terms).slice(0, 5),
    date: item.date || item.updated_at || item.published_at || null
  }
}

function buildNewsIntelligence(news, coin){
  const items = normalizeList(news)
  const sources = unique(items.map(item => item.source || sourceFromUrl(item.url)).filter(Boolean))
  const usefulItems = items.filter(item => item?.useful?.keep !== false)
  const highRisk = items.filter(item => item?.risk?.level === 'high')
  const surprise = items.filter(item => item?.context?.novelty === 'surprise')
  const expected = items.filter(item => item?.context?.novelty === 'expected')
  const source = coin?.source || 'unknown'
  const usefulRatio = items.length > 0 ? usefulItems.length / items.length : 0

  return {
    collected: normalizeList(coin?.news).length || items.length,
    analyzed: items.length,
    source,
    source_count: sources.length,
    sources,
    useful_ratio: Number(usefulRatio.toFixed(2)),
    high_risk_count: highRisk.length,
    surprise_count: surprise.length,
    expected_count: expected.length,
    stance: usefulRatio >= 0.5 ? 'signal_rich' : usefulRatio >= 0.25 ? 'mixed' : 'thin_signal',
    summary: explainNewsSummary({ source, sources, items, usefulRatio, highRisk, surprise, expected }),
    key_items: items
      .slice()
      .sort((a, b) => Number(b?.useful?.score || 0) - Number(a?.useful?.score || 0))
      .slice(0, 5)
      .map(item => ({
        title: item.translated?.title || item.title || 'Sem titulo',
        url: item.url || '',
        source: item.source || sourceFromUrl(item.url),
        usefulness: Number(item?.useful?.score || 0),
        risk: item?.risk?.level || 'low',
        context: item?.context?.novelty || 'unknown',
        reasons: normalizeList(item?.useful?.reasons).slice(0, 3)
      }))
  }
}

function buildSegments({ symbol, profile, news, gitIntel, marketIntel, risk, sentiment }){
  const scores = new Map()

  for(const segmentKey of profile.base_segments){
    addSegmentScore(scores, segmentKey, 3, 'perfil do ativo', null)
  }

  for(const item of news){
    const title = item.translated?.title || item.title || ''
    const body = item.translated?.body || item.body || ''
    const text = normalizeText(`${title} ${body} ${normalizeList(item?.useful?.reasons).join(' ')}`)

    for(const segment of segmentCatalog){
      const matches = segment.terms.filter(term => text.includes(normalizeText(term)))
      if(matches.length > 0){
        addSegmentScore(scores, segment.key, matches.length * 2, `noticia: ${matches.slice(0, 3).join(', ')}`, {
          title,
          url: item.url || '',
          risk: item?.risk?.level || 'low'
        })
      }
    }
  }

  if(gitIntel.available_count > 0){
    addSegmentScore(scores, 'developer_infra', Math.max(4, Math.round(gitIntel.lead_score / 10)), 'atividade no GitHub', {
      title: gitIntel.summary,
      url: ''
    })

    gitIntel.top_items.forEach(item => {
      if(item.category?.includes('security')){
        addSegmentScore(scores, 'security', 4, 'sinal tecnico de seguranca/confiabilidade', item)
      }
      if(item.category?.includes('consensus') || item.category?.includes('network')){
        addSegmentScore(scores, 'developer_infra', 4, 'sinal tecnico em area critica', item)
      }
    })
  }

  if(marketIntel.available){
    addSegmentScore(scores, 'macro_etf', marketIntel.risk_regime === 'risk_on' ? 4 : 2, 'regime de mercado', {
      title: marketIntel.risk_interpretation,
      url: ''
    })

    if(marketIntel.altseason_probability >= 45){
      addSegmentScore(scores, 'l1_l2', 3, 'pressao de rotacao para alts', {
        title: marketIntel.alt_interpretation,
        url: ''
      })
    }

    if(marketIntel.strongest_rotation?.sector){
      addSegmentScore(scores, marketIntel.strongest_rotation.sector, 4, 'rotacao setorial de mercado', {
        title: `${marketIntel.strongest_rotation.sector}: ${marketIntel.strongest_rotation.average_7d}% em 7d`,
        url: ''
      })
    }
  }

  const output = [...scores.entries()].map(([key, data]) => {
    const segment = findSegment(key)
    const score = data.score
    const stance = inferSegmentStance({ key, score, risk, sentiment, gitIntel, examples: data.examples })
    return {
      key,
      label: segment.label,
      description: segment.description,
      score,
      confidence: Number(Math.min(0.92, 0.35 + score * 0.07).toFixed(2)),
      stance,
      why: data.reasons.slice(0, 4),
      examples: data.examples.slice(0, 3),
      interpretation: explainSegment(segment, stance, score)
    }
  })

  return output
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

function addSegmentScore(scores, key, score, reason, example){
  const current = scores.get(key) || { score: 0, reasons: [], examples: [] }
  current.score += score
  if(reason && !current.reasons.includes(reason)) current.reasons.push(reason)
  if(example) current.examples.push(example)
  scores.set(key, current)
}

function inferMarketState({ symbol, profile, risk, sentiment, community, gitIntel, marketIntel, newsIntel, segments }){
  const score = Number(sentiment?.score || 0)
  const riskLevel = risk?.level || 'unknown'
  const gitStrong = gitIntel.lead_score >= 25
  const surprise = Number(community?.counts?.surprise || newsIntel.surprise_count || 0)
  const expected = Number(community?.counts?.expected || newsIntel.expected_count || 0)
  let phase = 'mixed_information'
  const drivers = []
  const caveats = []

  if(marketIntel.risk_regime === 'risk_off'){
    phase = 'market_risk_off'
    drivers.push('Market Cycle aponta regime defensivo.')
  }else if(marketIntel.altseason_probability >= 70){
    phase = 'altseason_pressure'
    drivers.push('Market Cycle mostra pressao ampla de altseason.')
  }else if(marketIntel.altseason_probability >= 45){
    phase = 'selective_alt_rotation'
    drivers.push('Market Cycle mostra rotacao seletiva para alts/setores.')
  }else if(symbol === 'BTC' && gitStrong && riskLevel !== 'high'){
    phase = 'structural_watch'
    drivers.push('GitHub mostra entrega/atividade relevante enquanto o risco de noticias nao domina.')
  }else if(riskLevel === 'high' && score < 0){
    phase = 'risk_off_news_pressure'
    drivers.push('Risco alto e sentimento negativo indicam pressao de manchetes ou eventos adversos.')
  }else if(gitStrong && score < 0){
    phase = 'headline_fear_structural_activity'
    drivers.push('Noticias pesam, mas atividade tecnica segue forte; isso pode ser medo de curto prazo com construcao por baixo.')
  }else if(score > 0 && gitStrong){
    phase = 'constructive_alignment'
    drivers.push('Noticias e desenvolvimento apontam para um quadro construtivo.')
  }else if(newsIntel.stance === 'thin_signal'){
    phase = 'low_signal'
    drivers.push('Poucas noticias uteis passaram pelo filtro; melhor tratar a leitura como fraca.')
  }

  if(surprise > expected){
    caveats.push('Mais surpresa do que evento esperado: maior chance de narrativa mudar rapido.')
  }

  if(gitIntel.errors.length > 0){
    caveats.push('Parte dos dados do GitHub falhou; use token para reduzir rate limit e lacunas.')
  }

  if(marketIntel.errors?.length > 0){
    caveats.push('Parte dos dados de mercado falhou; ciclo pode estar incompleto.')
  }

  if(newsIntel.source_count <= 1){
    caveats.push('Pouca diversidade de fontes; consenso externo ainda fraco.')
  }

  return {
    asset_name: profile.name,
    role: profile.role,
    phase,
    bias: inferBias(riskLevel, score, gitIntel.lead_score),
    market_cycle: {
      btc_phase: marketIntel.btc_phase,
      alt_state: marketIntel.alt_state,
      altseason_probability: marketIntel.altseason_probability,
      risk_regime: marketIntel.risk_regime,
      target_health: marketIntel.target_health
    },
    primary_segment: segments[0]?.label || 'Sem segmento dominante',
    drivers,
    caveats
  }
}

function buildConsensus({ risk, sentiment, community, gitIntel, marketIntel, newsIntel, segments }){
  const positive = []
  const negative = []
  const neutral = []
  const conflicts = []
  const score = Number(sentiment?.score || 0)
  const riskLevel = risk?.level || 'unknown'

  if(score > 0) positive.push('Sentimento das noticias filtradas esta positivo.')
  if(score < 0) negative.push('Sentimento das noticias filtradas esta negativo.')
  if(score === 0) neutral.push('Sentimento esta neutro.')

  if(gitIntel.lead_score >= 25) positive.push('GitHub tem atividade relevante antes de virar manchete.')
  if(gitIntel.lead_score < 12) neutral.push('GitHub nao mostra sinal tecnico forte na amostra.')

  if(riskLevel === 'high') negative.push('Risk Agent marcou risco alto.')
  if(riskLevel === 'low') positive.push('Risk Agent marcou risco baixo.')

  if(marketIntel.risk_regime === 'risk_on' || marketIntel.risk_regime === 'selective_risk_on'){
    positive.push(`Market Cycle esta ${marketIntel.risk_regime}.`)
  }

  if(marketIntel.risk_regime === 'risk_off'){
    negative.push('Market Cycle marcou regime risk-off.')
  }

  if(marketIntel.altseason_probability >= 70){
    positive.push('Probabilidade de altseason esta alta na amostra.')
  }else if(marketIntel.altseason_probability !== null && marketIntel.altseason_probability < 25){
    neutral.push('Altseason fraca: leitura ainda parece BTC-led ou defensiva.')
  }

  if(marketIntel.target_health === 'fragile'){
    negative.push('Saude de mercado do ativo esta fragil.')
  }

  if(marketIntel.target_health === 'strong'){
    positive.push('Saude de mercado do ativo esta forte.')
  }

  if(Number(community?.counts?.surprise || 0) > Number(community?.counts?.expected || 0)){
    negative.push('Ha mais sinais de surpresa do que eventos esperados.')
  }

  if(newsIntel.useful_ratio >= 0.5) positive.push('Boa parte das noticias passou no filtro de utilidade.')
  if(newsIntel.useful_ratio < 0.25) neutral.push('Pouca noticia util; amostra pode estar ruidosa.')

  if(score < 0 && gitIntel.lead_score >= 25){
    conflicts.push('Manchetes negativas versus desenvolvimento forte: separar curto prazo de estrutura.')
  }

  if(marketIntel.risk_regime === 'risk_off' && gitIntel.lead_score >= 25){
    conflicts.push('GitHub forte em regime risk-off: desenvolvimento pode estar bom, mas mercado nao esta pagando risco.')
  }

  if(marketIntel.altseason_probability >= 45 && riskLevel === 'high'){
    conflicts.push('Rotacao para alts com risco alto: procurar se e rotacao saudavel ou especulacao frágil.')
  }

  if(riskLevel === 'high' && segments.some(segment => segment.key === 'developer_infra' && segment.score >= 6)){
    conflicts.push('Risco alto nas noticias, mas GitHub ativo; pode ser correcao tecnica em andamento, nao apenas deterioracao.')
  }

  const alignment = conflicts.length > 0
    ? 'divergent'
    : positive.length > negative.length
      ? 'constructive'
      : negative.length > positive.length
        ? 'defensive'
        : 'mixed'

  return {
    alignment,
    positive,
    negative,
    neutral,
    conflicts,
    summary: explainConsensus(alignment, positive, negative, conflicts)
  }
}

function calculateConfidence({ coin, newsIntel, gitIntel, marketIntel, consensus }){
  let confidence = 0.35
  confidence += Math.min(0.2, newsIntel.analyzed * 0.01)
  confidence += Math.min(0.15, newsIntel.source_count * 0.05)
  confidence += gitIntel.available_count > 0 ? 0.15 : 0
  confidence += marketIntel.available ? 0.12 : 0
  confidence += consensus.conflicts.length === 0 ? 0.08 : -0.04
  confidence += coin?.source && coin.source !== 'unknown' ? 0.05 : 0
  confidence -= gitIntel.errors.length > 0 && gitIntel.available_count === 0 ? 0.12 : 0
  confidence -= marketIntel.errors?.length > 0 && !marketIntel.available ? 0.08 : 0
  return Number(Math.max(0.15, Math.min(0.92, confidence)).toFixed(2))
}

function decideActionability({ risk, sentiment, gitIntel, marketIntel, newsIntel, consensus, confidence }){
  const score = Number(sentiment?.score || 0)
  const riskLevel = risk?.level || 'unknown'

  if(confidence < 0.35 || newsIntel.stance === 'thin_signal'){
    return 'research_more'
  }

  if(riskLevel === 'high' && score < 0){
    return gitIntel.lead_score >= 25 ? 'caution_watch_git' : 'caution'
  }

  if(marketIntel.risk_regime === 'risk_off'){
    return 'market_defensive'
  }

  if(marketIntel.altseason_probability >= 70 && riskLevel !== 'high'){
    return 'watch_rotation'
  }

  if(consensus.alignment === 'divergent'){
    return 'separate_noise_from_signal'
  }

  if(gitIntel.lead_score >= 25 && riskLevel !== 'high'){
    return 'watch'
  }

  return 'monitor'
}

function buildExecutive({ symbol, profile, marketState, consensus, actionability, confidence, segments, gitIntel, marketIntel, newsIntel }){
  const topSegment = segments[0]
  const title = `${profile.name || symbol}: ${translatePhase(marketState.phase)}`
  const readout = [
    `Segmento dominante: ${topSegment?.label || 'sem dominio claro'}.`,
    `Mercado: ${marketIntel.summary}`,
    `GitHub: ${gitIntel.summary}`,
    `Noticias: ${newsIntel.summary}`,
    `Consenso: ${consensus.summary}`
  ]

  return {
    title,
    verdict: buildVerdict(actionability, marketState, consensus),
    actionability,
    confidence,
    readout,
    what_changed: buildWhatChanged({ gitIntel, marketIntel, newsIntel, segments }),
    next_questions: buildNextQuestions({ actionability, topSegment, gitIntel })
  }
}

function buildMetricExplanations({ coin, filtered, news, risk, sentiment, community, gitIntel, marketIntel, segments, confidence, actionability }){
  const total = normalizeList(coin?.news).length || news.length
  const useful = filtered.length

  return [
    metric('noticias_coletadas', 'Noticias coletadas', total, 'Tamanho da amostra inicial. Mais itens ajudam, mas qualidade e diversidade de fonte importam mais que quantidade.', total >= 10 ? 'ok' : 'thin'),
    metric('noticias_uteis', 'Noticias uteis', useful, 'Itens que passaram por filtro de relevancia: pessoas, empresas, reguladores, temas fortes e ativos citados.', useful >= 5 ? 'ok' : 'thin'),
    metric('risco', 'Risco', risk?.level || 'unknown', 'Leitura de termos como hack, exploit, processo, investigacao, outage e ajuste por contexto comunitario.', risk?.level === 'high' ? 'alert' : 'ok'),
    metric('sentimento', 'Score sentimento', Number(sentiment?.score || 0), 'Saldo simples entre noticias positivas e negativas filtradas. Nao mede preco; mede tom informacional.', Number(sentiment?.score || 0) < 0 ? 'negative' : 'ok'),
    metric('contexto_esperado', 'Contexto esperado', Number(community?.counts?.expected || 0), 'Eventos parecidos com temas ja discutidos pela comunidade. Tende a reduzir surpresa.', 'ok'),
    metric('surpresas', 'Surpresas', Number(community?.counts?.surprise || 0), 'Eventos que parecem mais repentinos: risco de repricing e mudanca de narrativa.', Number(community?.counts?.surprise || 0) > 0 ? 'watch' : 'ok'),
    metric('git_lead', 'Git lead', gitIntel.lead_score, 'Forca dos sinais do GitHub: commits, PRs, releases, forks ativos e impacto tecnico antes de virar noticia.', gitIntel.lead_score >= 25 ? 'strong' : 'quiet'),
    metric('btc_cycle', 'Ciclo BTC', marketIntel.btc_phase, 'Fase estimada por dominancia BTC, momentum de BTC e relacao ETH/BTC.', marketIntel.btc_phase?.includes('risk') ? 'watch' : 'ok'),
    metric('altseason', 'Prob. altseason', marketIntel.altseason_probability === null ? '-' : `${marketIntel.altseason_probability}%`, 'Probabilidade heuristica por dominancia BTC, ETH/BTC e breadth de alts da amostra.', marketIntel.altseason_probability >= 70 ? 'strong' : marketIntel.altseason_probability >= 45 ? 'watch' : 'ok'),
    metric('regime_mercado', 'Regime mercado', marketIntel.risk_regime, 'Leitura de risk-on/risk-off usando market cap, BTC, ETH e media de alts.', marketIntel.risk_regime === 'risk_off' ? 'alert' : 'ok'),
    metric('saude_ativo', 'Saude do ativo', marketIntel.target_health, 'Rank, volume relativo, momentum, FDV/market cap e comparacao com pares do setor.', marketIntel.target_health === 'fragile' ? 'watch' : 'ok'),
    metric('segmento_principal', 'Segmento principal', segments[0]?.label || 'sem dominio', 'Tema mais recorrente cruzando noticias, perfil do ativo e GitHub.', 'ok'),
    metric('confianca', 'Confianca', `${Math.round(confidence * 100)}%`, 'Qualidade da leitura considerando tamanho da amostra, diversidade de fontes, Git disponivel e conflitos entre sinais.', confidence >= 0.6 ? 'ok' : 'watch'),
    metric('acao', 'Postura operacional', translateAction(actionability), 'Nao e compra/venda. E a postura de leitura: monitorar, pesquisar mais, cautela ou separar ruido de sinal.', 'ok')
  ]
}

function buildActionPlan({ actionability, risk, sentiment, gitIntel, marketIntel, consensus, segments }){
  const plan = []
  const topSegment = segments[0]?.label || 'segmento dominante'

  plan.push({
    level: 'now',
    title: 'Leitura principal',
    body: buildVerdict(actionability, { primary_segment: topSegment }, consensus)
  })

  if(risk?.level === 'high'){
    plan.push({
      level: 'risk',
      title: 'Separar evento de estrutura',
      body: 'Risco alto pede leitura defensiva: identificar se a causa e hack/regulacao/outage ou apenas manchete negativa sem dano estrutural.'
    })
  }

  if(marketIntel.risk_regime === 'risk_off'){
    plan.push({
      level: 'market',
      title: 'Regime defensivo',
      body: 'Em risk-off, priorize confirmacao por preco/volume antes de tratar noticia ou Git forte como gatilho.'
    })
  }

  if(marketIntel.altseason_probability >= 45){
    plan.push({
      level: 'rotation',
      title: 'Rotacao setorial',
      body: `Altseason/rotacao em ${marketIntel.altseason_probability}%. Compare o ativo com o setor mais forte antes de concluir que o movimento e amplo.`
    })
  }

  if(Number(sentiment?.score || 0) < 0 && gitIntel.lead_score >= 25){
    plan.push({
      level: 'research',
      title: 'Divergencia util',
      body: 'Sentimento negativo com Git forte costuma ser o ponto onde o bot precisa olhar PRs, releases e forks antes da noticia mastigar a narrativa.'
    })
  }

  plan.push({
    level: 'next',
    title: 'Proximo dado que falta',
    body: 'Proxima expansao: funding, open interest, ETF flows e onchain para sair de ciclo heuristico e ir para ciclo confirmado.'
  })

  return plan
}

function buildGlossary(){
  return [
    { term: 'Git lead', meaning: 'Pontuacao de atividade tecnica antes de virar noticia. Alto nao significa compra; significa que ha algo acontecendo no desenvolvimento.' },
    { term: 'Dificuldade', meaning: 'Sinal de atrito: crash, fail, regression, security, PR dificil ou area critica. Pode ser risco ou manutencao saudavel.' },
    { term: 'Acerto', meaning: 'Entrega positiva: release, fix, merge, melhoria de performance ou estabilidade.' },
    { term: 'Contexto esperado', meaning: 'Tema que a comunidade ja vinha discutindo. Costuma ter menor poder de surpresa.' },
    { term: 'Surpresa', meaning: 'Evento menos esperado. Pode mexer mais com narrativa e risco.' },
    { term: 'Segmento', meaning: 'Tema de mercado onde o ativo/noticias/Git se encaixam: ETF, DeFi, IA, privacidade, seguranca, CEX etc.' },
    { term: 'Ciclo BTC', meaning: 'Fase heuristica por dominancia, momentum BTC e ETH/BTC. Ajuda a entender se BTC lidera, lateraliza ou distribui risco.' },
    { term: 'Altseason', meaning: 'Pressao de rotacao para alts medida por dominancia BTC, ETH/BTC e quantas alts superam BTC na amostra.' },
    { term: 'Regime de mercado', meaning: 'Risk-on/risk-off agregado usando market cap, BTC, ETH e media de alts.' }
  ]
}

function explainGitSummary(strongest, topItems, errors){
  if(!strongest && errors.length > 0){
    return 'GitHub indisponivel na amostra; configure GITHUB_TOKEN ou tente novamente.'
  }

  if(!strongest){
    return 'Sem repositorio GitHub configurado para este ativo.'
  }

  const lead = Number(strongest.lead_score || strongest.top?.score || 0)
  const main = topItems[0]

  if(main){
    return `${strongest.repo} tem lead ${lead}; principal sinal: ${main.category} (${main.impact_level}) - ${main.title}.`
  }

  return `${strongest.repo} tem lead ${lead}, mas sem item tecnico dominante.`
}

function explainGitItem(kind, title, impactLevel){
  if(kind === 'difficulty') return `Dificuldade tecnica de impacto ${impactLevel}: precisa de contexto antes de virar narrativa.`
  if(kind === 'success') return `Entrega ou melhoria de impacto ${impactLevel}.`
  return `Sinal Git de impacto ${impactLevel}: ${title}.`
}

function explainNewsSummary({ source, sources, items, usefulRatio, highRisk, surprise, expected }){
  const sourceText = sources.length > 1 ? `${sources.length} fontes` : source
  const quality = usefulRatio >= 0.5 ? 'boa densidade de sinal' : usefulRatio >= 0.25 ? 'sinal misto' : 'muito ruido'
  return `${items.length} itens analisados de ${sourceText}; ${quality}; ${highRisk.length} item(ns) de alto risco, ${expected.length} esperado(s), ${surprise.length} surpresa(s).`
}

function explainSegment(segment, stance, score){
  const intensity = score >= 10 ? 'dominante' : score >= 6 ? 'relevante' : 'secundario'
  return `${segment.label} aparece como ${intensity}; postura ${stance}. ${segment.description}`
}

function explainConsensus(alignment, positive, negative, conflicts){
  if(conflicts.length > 0) return `sinais divergentes: ${conflicts[0]}`
  if(alignment === 'constructive') return `construtivo: ${positive[0] || 'mais evidencias positivas que negativas'}`
  if(alignment === 'defensive') return `defensivo: ${negative[0] || 'mais evidencias negativas que positivas'}`
  return 'misto: nenhum bloco de sinal domina claramente.'
}

function buildVerdict(actionability, marketState, consensus){
  const action = translateAction(actionability)
  return `${action}. ${consensus.summary} Segmento foco: ${marketState.primary_segment}.`
}

function buildWhatChanged({ gitIntel, marketIntel, newsIntel, segments }){
  const changes = []
  if(marketIntel.available) changes.push(`Mercado: ${marketIntel.risk_regime}, altseason ${marketIntel.altseason_probability ?? '-'}%, ativo ${marketIntel.target_health}.`)
  if(gitIntel.top_items[0]) changes.push(`Git: ${gitIntel.top_items[0].category} (${gitIntel.top_items[0].impact_level}) - ${gitIntel.top_items[0].title}`)
  if(newsIntel.key_items[0]) changes.push(`Noticia: ${newsIntel.key_items[0].title}`)
  if(segments[0]) changes.push(`Segmento: ${segments[0].label}`)
  return changes
}

function buildNextQuestions({ actionability, topSegment, gitIntel }){
  const questions = [
    `O segmento ${topSegment?.label || 'dominante'} tambem aparece em preco, volume ou onchain?`,
    'Ha mais de uma fonte confirmando a mesma narrativa?',
    'O sinal Git e doc/test/CI ou mexe em consenso, seguranca, rede ou wallet?'
  ]

  if(actionability.includes('caution')){
    questions.unshift('O risco alto e evento pontual ou muda a tese estrutural?')
  }

  if(gitIntel.errors.length > 0){
    questions.push('O GitHub retornou erro/rate limit? Configure GITHUB_TOKEN para melhorar cobertura.')
  }

  return questions.slice(0, 5)
}

function inferSegmentStance({ key, score, risk, sentiment, gitIntel, examples }){
  if(key === 'security' || normalizeList(examples).some(item => item.risk === 'high')) return 'risco'
  if(key === 'developer_infra' && gitIntel.lead_score >= 25) return 'construtivo'
  if(risk?.level === 'high' && Number(sentiment?.score || 0) < 0) return 'defensivo'
  if(Number(sentiment?.score || 0) > 0 && score >= 6) return 'favoravel'
  return 'monitorar'
}

function inferBias(riskLevel, sentimentScore, gitLead){
  if(riskLevel === 'high' && sentimentScore < 0) return 'defensive'
  if(gitLead >= 25 && sentimentScore >= 0) return 'constructive'
  if(gitLead >= 25 && sentimentScore < 0) return 'mixed_but_structural'
  return 'neutral'
}

function translatePhase(phase){
  const labels = {
    structural_watch: 'estrutura em observacao',
    risk_off_news_pressure: 'pressao de risco nas noticias',
    headline_fear_structural_activity: 'medo nas manchetes, atividade por baixo',
    constructive_alignment: 'alinhamento construtivo',
    low_signal: 'sinal fraco',
    mixed_information: 'informacao mista'
  }
  return labels[phase] || phase
}

function translateAction(action){
  const labels = {
    research_more: 'Pesquisar mais',
    caution_watch_git: 'Cautela, mas acompanhar Git',
    caution: 'Cautela',
    separate_noise_from_signal: 'Separar ruido de sinal',
    market_defensive: 'Mercado defensivo',
    watch_rotation: 'Monitorar rotacao',
    watch: 'Monitorar de perto',
    monitor: 'Monitorar'
  }
  return labels[action] || action
}

function metric(key, label, value, meaning, quality){
  return { key, label, value, meaning, quality }
}

function findSegment(key){
  return segmentCatalog.find(segment => segment.key === key) || {
    key,
    label: key,
    description: 'Segmento detectado por perfil ou sinais.'
  }
}

function sourceFromUrl(url){
  try{
    return new URL(url).hostname.replace(/^www\./, '')
  }catch(error){
    return ''
  }
}

function buildUnknownProfile(symbol){
  return {
    name: symbol || 'Ativo',
    role: 'ativo cripto sem perfil local detalhado',
    base_segments: ['developer_infra']
  }
}

function inferImpactLevel(value){
  const score = Number(value || 0)
  if(score >= 30) return 'critical'
  if(score >= 20) return 'high'
  if(score >= 10) return 'medium'
  return 'low'
}

function normalizeSymbol(value){
  return String(value || '').trim().toUpperCase()
}

function normalizeText(value){
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizeList(value){
  if(Array.isArray(value)) return value
  if(value && typeof value === 'object') return Object.values(value)
  return []
}

function unique(values){
  return [...new Set(values)]
}

export default { analyzeIntelligence }
