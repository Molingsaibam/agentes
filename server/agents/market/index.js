import axios from 'axios'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

const assetMap = {
  BTC: { id: 'bitcoin', name: 'Bitcoin', sector: 'bitcoin' },
  ETH: { id: 'ethereum', name: 'Ethereum', sector: 'l1_l2' },
  SOL: { id: 'solana', name: 'Solana', sector: 'l1_l2' },
  XRP: { id: 'ripple', name: 'XRP', sector: 'payments' },
  BNB: { id: 'binancecoin', name: 'BNB', sector: 'exchange_cex' },
  ADA: { id: 'cardano', name: 'Cardano', sector: 'l1_l2' },
  LINK: { id: 'chainlink', name: 'Chainlink', sector: 'oracle_data' },
  ZEC: { id: 'zcash', name: 'Zcash', sector: 'privacy_zk' },
  DOGE: { id: 'dogecoin', name: 'Dogecoin', sector: 'memecoin' },
  AVAX: { id: 'avalanche-2', name: 'Avalanche', sector: 'l1_l2' },
  TON: { id: 'the-open-network', name: 'Toncoin', sector: 'l1_l2' },
  DOT: { id: 'polkadot', name: 'Polkadot', sector: 'l1_l2' },
  UNI: { id: 'uniswap', name: 'Uniswap', sector: 'defi' },
  AAVE: { id: 'aave', name: 'Aave', sector: 'defi' },
  RNDR: { id: 'render-token', name: 'Render', sector: 'ai_compute' },
  RENDER: { id: 'render-token', name: 'Render', sector: 'ai_compute' },
  FET: { id: 'fetch-ai', name: 'Fetch.ai', sector: 'ai_compute' },
  ONDO: { id: 'ondo-finance', name: 'Ondo', sector: 'rwa' }
}

const benchmarkSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'LINK', 'DOGE', 'AVAX', 'DOT', 'UNI', 'AAVE', 'RNDR', 'ONDO', 'ZEC']

export async function analyzeMarketCycle(symbol, options = {}){
  const normalizedSymbol = normalizeSymbol(symbol)
  const profile = assetMap[normalizedSymbol] || { id: null, name: normalizedSymbol || 'Unknown asset', sector: 'unknown' }
  const timeout = Number(options.timeoutMs || process.env.MARKET_TIMEOUT_MS || 12000)
  const errors = []
  let global = null
  let markets = []

  try{
    global = await fetchGlobal(timeout)
  }catch(error){
    errors.push({ area: 'global', error: error.message })
  }

  try{
    markets = await fetchMarkets(profile, timeout)
  }catch(error){
    errors.push({ area: 'markets', error: error.message })
  }

  const bySymbol = indexMarkets(markets)
  const target = bySymbol[normalizedSymbol] || findMarketById(markets, profile.id)
  const btc = bySymbol.BTC || findMarketById(markets, 'bitcoin')
  const eth = bySymbol.ETH || findMarketById(markets, 'ethereum')
  const benchmarks = benchmarkSymbols
    .map(symbolKey => bySymbol[symbolKey])
    .filter(Boolean)

  const btcCycle = inferBtcCycle(global, btc, eth)
  const altCycle = inferAltCycle(global, btc, eth, benchmarks)
  const riskRegime = inferRiskRegime(global, btc, eth, benchmarks)
  const targetHealth = inferTargetHealth(normalizedSymbol, profile, target, btc, benchmarks)
  const rotation = inferSectorRotation(benchmarks)

  return {
    symbol: normalizedSymbol,
    source: markets.length > 0 || global ? 'coingecko' : 'fallback',
    fetched_at: new Date().toISOString(),
    profile,
    global: summarizeGlobal(global),
    target: summarizeMarket(target, profile),
    btc_cycle: btcCycle,
    alt_cycle: altCycle,
    risk_regime: riskRegime,
    target_health: targetHealth,
    sector_rotation: rotation,
    explanation: buildMarketExplanation({ normalizedSymbol, profile, btcCycle, altCycle, riskRegime, targetHealth, rotation, errors }),
    metrics: buildMarketMetrics({ global, target, btc, eth, btcCycle, altCycle, riskRegime, targetHealth }),
    errors
  }
}

async function fetchGlobal(timeout){
  const response = await axios.get(`${COINGECKO_API}/global`, {
    timeout,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'market-agents-market'
    }
  })

  return response.data?.data || null
}

async function fetchMarkets(profile, timeout){
  const ids = unique([
    profile.id,
    ...benchmarkSymbols.map(symbol => assetMap[symbol]?.id)
  ].filter(Boolean))

  const response = await axios.get(`${COINGECKO_API}/coins/markets`, {
    timeout,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'market-agents-market'
    },
    params: {
      vs_currency: 'usd',
      ids: ids.join(','),
      order: 'market_cap_desc',
      per_page: ids.length,
      page: 1,
      sparkline: false,
      price_change_percentage: '24h,7d,30d'
    }
  })

  return Array.isArray(response.data) ? response.data : []
}

function inferBtcCycle(global, btc, eth){
  const dominance = Number(global?.market_cap_percentage?.btc || 0)
  const btc7d = number(btc?.price_change_percentage_7d_in_currency)
  const btc30d = number(btc?.price_change_percentage_30d_in_currency)
  const eth7d = number(eth?.price_change_percentage_7d_in_currency)
  const ethVsBtc = eth7d - btc7d
  let phase = 'unknown'
  const drivers = []

  if(btc30d > 18 && btc7d > 3 && dominance >= 50){
    phase = 'btc_expansion'
    drivers.push('BTC sobe em 30d e 7d com dominancia alta.')
  }else if(btc30d > 25 && btc7d < 0){
    phase = 'late_cycle_cooling'
    drivers.push('BTC ainda forte em 30d, mas perdeu tracao em 7d.')
  }else if(btc30d < -10 && btc7d < 0){
    phase = 'risk_off_drawdown'
    drivers.push('BTC cai em 30d e 7d.')
  }else if(Math.abs(btc30d) <= 10 && dominance >= 52){
    phase = 'btc_accumulation_or_range'
    drivers.push('BTC lateral/moderado com dominancia alta.')
  }else if(ethVsBtc > 5 && dominance < 52){
    phase = 'rotation_from_btc'
    drivers.push('ETH supera BTC e dominancia BTC nao esta dominante.')
  }else{
    phase = 'mixed_btc_cycle'
    drivers.push('Sinais de preco e dominancia nao apontam fase unica.')
  }

  return {
    phase,
    dominance: round(dominance, 2),
    btc_change_7d: round(btc7d, 2),
    btc_change_30d: round(btc30d, 2),
    eth_vs_btc_7d: round(ethVsBtc, 2),
    interpretation: explainBtcPhase(phase),
    drivers
  }
}

function inferAltCycle(global, btc, eth, benchmarks){
  const dominance = Number(global?.market_cap_percentage?.btc || 0)
  const btc7d = number(btc?.price_change_percentage_7d_in_currency)
  const eth7d = number(eth?.price_change_percentage_7d_in_currency)
  const alts = benchmarks.filter(item => item.symbol?.toUpperCase() !== 'BTC')
  const outperformers = alts.filter(item => number(item.price_change_percentage_7d_in_currency) > btc7d)
  const positiveAlts = alts.filter(item => number(item.price_change_percentage_7d_in_currency) > 0)
  const breadth = alts.length > 0 ? outperformers.length / alts.length : 0
  const positiveBreadth = alts.length > 0 ? positiveAlts.length / alts.length : 0
  const ethVsBtc = eth7d - btc7d
  const dominanceScore = dominance <= 48 ? 25 : dominance <= 52 ? 15 : dominance <= 56 ? 8 : 2
  const breadthScore = Math.round(breadth * 45)
  const ethScore = ethVsBtc > 8 ? 20 : ethVsBtc > 3 ? 12 : ethVsBtc > 0 ? 6 : 0
  const positiveScore = Math.round(positiveBreadth * 10)
  const probability = clamp(dominanceScore + breadthScore + ethScore + positiveScore, 0, 100)
  const state = probability >= 70 ? 'altseason_pressure'
    : probability >= 45 ? 'selective_alt_rotation'
      : probability >= 25 ? 'early_or_fragile_rotation'
        : 'btc_led_or_risk_off'

  return {
    state,
    probability,
    alt_outperformance_ratio: round(breadth, 2),
    positive_alt_ratio: round(positiveBreadth, 2),
    eth_vs_btc_7d: round(ethVsBtc, 2),
    interpretation: explainAltState(state),
    outperformers: outperformers
      .sort((a, b) => number(b.price_change_percentage_7d_in_currency) - number(a.price_change_percentage_7d_in_currency))
      .slice(0, 5)
      .map(item => ({
        symbol: item.symbol?.toUpperCase(),
        name: item.name,
        change_7d: round(number(item.price_change_percentage_7d_in_currency), 2)
      }))
  }
}

function inferRiskRegime(global, btc, eth, benchmarks){
  const totalCapChange = number(global?.market_cap_change_percentage_24h_usd)
  const btc7d = number(btc?.price_change_percentage_7d_in_currency)
  const eth7d = number(eth?.price_change_percentage_7d_in_currency)
  const altAverage = average(benchmarks
    .filter(item => item.symbol?.toUpperCase() !== 'BTC')
    .map(item => number(item.price_change_percentage_7d_in_currency)))
  let regime = 'neutral'
  const reasons = []

  if(totalCapChange > 1.5 && btc7d > 0 && eth7d > 0 && altAverage > 0){
    regime = 'risk_on'
    reasons.push('Market cap, BTC, ETH e media de alts estao positivos.')
  }else if(totalCapChange < -1.5 && btc7d < 0 && altAverage < 0){
    regime = 'risk_off'
    reasons.push('Mercado agregado, BTC e alts enfraquecem juntos.')
  }else if(btc7d > 0 && altAverage < btc7d){
    regime = 'btc_defensive_leadership'
    reasons.push('BTC lidera mais que alts, comum em defesa ou inicio de rotacao.')
  }else if(altAverage > btc7d && altAverage > 0){
    regime = 'selective_risk_on'
    reasons.push('Alts selecionadas superam BTC.')
  }else{
    reasons.push('Sinais mistos entre market cap, BTC, ETH e alts.')
  }

  return {
    regime,
    total_market_cap_change_24h: round(totalCapChange, 2),
    benchmark_alt_average_7d: round(altAverage, 2),
    interpretation: explainRiskRegime(regime),
    reasons
  }
}

function inferTargetHealth(symbol, profile, target, btc, benchmarks){
  if(!target){
    return {
      symbol,
      status: 'unavailable',
      score: 0,
      interpretation: 'Sem dados de mercado para o ativo.',
      reasons: []
    }
  }

  const rank = Number(target.market_cap_rank || 9999)
  const volume = Number(target.total_volume || 0)
  const marketCap = Number(target.market_cap || 0)
  const fdv = Number(target.fully_diluted_valuation || 0)
  const volumeRatio = marketCap > 0 ? volume / marketCap : 0
  const fdvRatio = marketCap > 0 && fdv > 0 ? fdv / marketCap : null
  const change7d = number(target.price_change_percentage_7d_in_currency)
  const change30d = number(target.price_change_percentage_30d_in_currency)
  const btc7d = number(btc?.price_change_percentage_7d_in_currency)
  const sectorPeers = benchmarks.filter(item => assetMap[item.symbol?.toUpperCase()]?.sector === profile.sector)
  const sectorAverage7d = average(sectorPeers.map(item => number(item.price_change_percentage_7d_in_currency)))
  let score = 50
  const reasons = []

  if(rank <= 20){ score += 12; reasons.push('market cap rank alto melhora liquidez e cobertura.') }
  else if(rank <= 100){ score += 6; reasons.push('rank intermediario com alguma liquidez.') }
  else { score -= 6; reasons.push('rank mais baixo aumenta risco de liquidez.') }

  if(change7d > btc7d){ score += 10; reasons.push('supera BTC em 7d.') }
  else { score -= 5; reasons.push('fica atras de BTC em 7d.') }

  if(change30d > 0){ score += 8; reasons.push('tendencia de 30d positiva.') }
  else if(change30d < -10){ score -= 10; reasons.push('queda relevante em 30d.') }

  if(volumeRatio > 0.08){ score += 8; reasons.push('volume relativo forte.') }
  else if(volumeRatio < 0.015){ score -= 6; reasons.push('volume relativo baixo.') }

  if(fdvRatio && fdvRatio > 2.5){ score -= 8; reasons.push('FDV muito acima do market cap pode indicar risco de diluicao/unlocks.') }
  if(Number.isFinite(sectorAverage7d) && change7d > sectorAverage7d){ score += 6; reasons.push('supera media dos pares de setor na amostra.') }

  const finalScore = clamp(Math.round(score), 0, 100)
  const status = finalScore >= 70 ? 'strong'
    : finalScore >= 50 ? 'neutral'
      : 'fragile'

  return {
    symbol,
    name: target.name || profile.name,
    sector: profile.sector,
    status,
    score: finalScore,
    rank,
    price: target.current_price,
    market_cap: marketCap,
    fully_diluted_valuation: fdv || null,
    fdv_to_market_cap: fdvRatio ? round(fdvRatio, 2) : null,
    volume_to_market_cap: round(volumeRatio, 4),
    change_24h: round(number(target.price_change_percentage_24h_in_currency ?? target.price_change_percentage_24h), 2),
    change_7d: round(change7d, 2),
    change_30d: round(change30d, 2),
    sector_average_7d: Number.isFinite(sectorAverage7d) ? round(sectorAverage7d, 2) : null,
    interpretation: explainTargetStatus(status),
    reasons
  }
}

function inferSectorRotation(benchmarks){
  const sectors = new Map()

  for(const item of benchmarks){
    const symbol = item.symbol?.toUpperCase()
    const sector = assetMap[symbol]?.sector || 'unknown'
    const current = sectors.get(sector) || { sector, symbols: [], changes: [] }
    current.symbols.push(symbol)
    current.changes.push(number(item.price_change_percentage_7d_in_currency))
    sectors.set(sector, current)
  }

  return [...sectors.values()]
    .map(item => ({
      sector: item.sector,
      symbols: item.symbols,
      average_7d: round(average(item.changes), 2),
      strength: average(item.changes) > 8 ? 'hot' : average(item.changes) > 0 ? 'positive' : 'weak'
    }))
    .sort((a, b) => b.average_7d - a.average_7d)
    .slice(0, 6)
}

function summarizeGlobal(global){
  if(!global) return null

  return {
    active_cryptocurrencies: global.active_cryptocurrencies,
    total_market_cap_usd: Math.round(Number(global.total_market_cap?.usd || 0)),
    total_volume_usd: Math.round(Number(global.total_volume?.usd || 0)),
    market_cap_change_24h: round(number(global.market_cap_change_percentage_24h_usd), 2),
    btc_dominance: round(Number(global.market_cap_percentage?.btc || 0), 2),
    eth_dominance: round(Number(global.market_cap_percentage?.eth || 0), 2)
  }
}

function summarizeMarket(target, profile){
  if(!target){
    return { symbol: profile.name, id: profile.id, available: false }
  }

  return {
    id: target.id,
    symbol: target.symbol?.toUpperCase(),
    name: target.name,
    available: true,
    rank: target.market_cap_rank,
    price: target.current_price,
    market_cap: target.market_cap,
    total_volume: target.total_volume,
    fully_diluted_valuation: target.fully_diluted_valuation,
    change_24h: round(number(target.price_change_percentage_24h_in_currency ?? target.price_change_percentage_24h), 2),
    change_7d: round(number(target.price_change_percentage_7d_in_currency), 2),
    change_30d: round(number(target.price_change_percentage_30d_in_currency), 2)
  }
}

function buildMarketMetrics({ global, target, btc, eth, btcCycle, altCycle, riskRegime, targetHealth }){
  return [
    metric('btc_dominance', 'Dominancia BTC', btcCycle.dominance, 'Quanto do market cap cripto esta concentrado em BTC. Alta dominancia costuma favorecer leitura BTC-led.'),
    metric('btc_7d', 'BTC 7d', btcCycle.btc_change_7d, 'Momentum curto de BTC. Ajuda a separar lideranca de medo.'),
    metric('eth_vs_btc', 'ETH vs BTC 7d', btcCycle.eth_vs_btc_7d, 'Proxy simples de rotacao para risco/altcoins.'),
    metric('altseason_probability', 'Prob. altseason', `${altCycle.probability}%`, 'Estimativa por dominancia, ETH/BTC e breadth de alts da amostra.'),
    metric('risk_regime', 'Regime de risco', riskRegime.regime, 'Leitura agregada de market cap, BTC, ETH e alts.'),
    metric('target_health', 'Saude do ativo', targetHealth.status, 'Combina rank, volume relativo, momentum, FDV/MC e comparacao setorial.'),
    metric('target_rank', 'Rank', target?.market_cap_rank || '-', 'Rank por market cap.'),
    metric('total_market_24h', 'Mercado 24h', summarizeGlobal(global)?.market_cap_change_24h ?? '-', 'Mudanca do market cap cripto em 24h.')
  ]
}

function buildMarketExplanation({ normalizedSymbol, profile, btcCycle, altCycle, riskRegime, targetHealth, rotation, errors }){
  const parts = [
    `${normalizedSymbol}: ${targetHealth.interpretation}`,
    `BTC cycle: ${btcCycle.interpretation}`,
    `Alt cycle: ${altCycle.interpretation}`,
    `Regime: ${riskRegime.interpretation}`
  ]

  if(rotation[0]){
    parts.push(`Rotacao mais forte na amostra: ${rotation[0].sector} (${rotation[0].average_7d}% em 7d).`)
  }

  if(errors.length > 0){
    parts.push('Dados parciais: algumas chamadas de mercado falharam.')
  }

  return parts.join(' ')
}

function metric(key, label, value, meaning){
  return { key, label, value, meaning }
}

function explainBtcPhase(phase){
  const labels = {
    btc_expansion: 'BTC lidera expansao; alts podem esperar confirmacao de rotacao.',
    late_cycle_cooling: 'BTC ainda mostra forca no periodo maior, mas curto prazo esfriou.',
    risk_off_drawdown: 'Fase defensiva: BTC e mercado perdem tracao.',
    btc_accumulation_or_range: 'BTC em faixa/absorção com dominancia alta.',
    rotation_from_btc: 'Sinal de rotacao saindo de BTC para ETH/alts.',
    mixed_btc_cycle: 'Ciclo BTC misto; precisa confirmar com volume e dominancia.'
  }
  return labels[phase] || 'Ciclo BTC indisponivel.'
}

function explainAltState(state){
  const labels = {
    altseason_pressure: 'Pressao clara de altseason na amostra.',
    selective_alt_rotation: 'Rotacao seletiva: alguns setores andam, mas nao e euforia ampla.',
    early_or_fragile_rotation: 'Rotacao inicial ou fragil; requer confirmacao.',
    btc_led_or_risk_off: 'BTC lidera ou mercado esta defensivo; cuidado com alts fracas.'
  }
  return labels[state] || 'Alt cycle indisponivel.'
}

function explainRiskRegime(regime){
  const labels = {
    risk_on: 'Mercado aceita risco; melhor ambiente para narrativas e alts.',
    risk_off: 'Mercado reduz risco; preservar contexto importa mais que perseguir narrativa.',
    btc_defensive_leadership: 'BTC lidera de forma defensiva; alts podem ficar seletivas.',
    selective_risk_on: 'Risco seletivo: setores especificos performam melhor.',
    neutral: 'Sem regime claro.'
  }
  return labels[regime] || 'Regime indefinido.'
}

function explainTargetStatus(status){
  const labels = {
    strong: 'Saude de mercado forte na amostra: liquidez/momentum/rank ajudam a sustentar a narrativa.',
    neutral: 'Saude de mercado neutra: ha sinais bons e fracos misturados.',
    fragile: 'Saude de mercado fragil: momentum, volume ou diluicao pedem cautela.',
    unavailable: 'Dados de mercado indisponiveis.'
  }
  return labels[status] || 'Leitura indisponivel.'
}

function indexMarkets(markets){
  return markets.reduce((acc, item) => {
    const symbol = item.symbol?.toUpperCase()
    if(symbol) acc[symbol] = item
    return acc
  }, {})
}

function findMarketById(markets, id){
  return markets.find(item => item.id === id) || null
}

function normalizeSymbol(value){
  return String(value || '').trim().toUpperCase()
}

function number(value){
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function average(values){
  const valid = values.filter(Number.isFinite)
  if(valid.length === 0) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function round(value, digits = 2){
  const factor = 10 ** digits
  return Math.round(number(value) * factor) / factor
}

function clamp(value, min, max){
  return Math.min(max, Math.max(min, value))
}

function unique(values){
  return [...new Set(values)]
}

export default { analyzeMarketCycle }
