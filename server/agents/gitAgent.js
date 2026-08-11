import axios from 'axios'
import etherscan from './etherscan/index.js'
import contractRiskAgent from './contractRiskAgent.js'

const DEFAULT_TRACKED = {
  BTC: 'bitcoin/bitcoin',
  ZEC: 'zcash/zcash',
  ETH: 'ethereum/go-ethereum',
  SOL: 'solana-labs/solana',
  LINK: 'smartcontractkit/chainlink'
}

const difficultyTerms = ['bug', 'fix', 'security', 'vuln', 'exploit', 'crash', 'fail', 'failure', 'regression', 'attack', 'incident', 'halt', 'emergency']
const successTerms = ['release', 'upgrade', 'improve', 'optimization', 'performance', 'merge', 'feature', 'support', 'add', 'implement', 'stability']

function makeHeaders(){
  const headers = { 'User-Agent': 'market-agents' }
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if(token){
    headers['Authorization'] = `token ${token}`
  }
  return headers
}

async function getCommits(repo, per = 5){
  const url = `https://api.github.com/repos/${repo}/commits?per_page=${per}`
  const res = await axios.get(url, { headers: makeHeaders() })
  return res.data || []
}

async function getCommitDetail(repo, sha){
  const url = `https://api.github.com/repos/${repo}/commits/${sha}`
  const res = await axios.get(url, { headers: makeHeaders() })
  return res.data
}

function scoreFiles(files = []){
  const high = ['consensus','privacy','wallet','core','protocol','zk','bridge','lib','src']
  const medium = ['security','attack','vuln','exploit','fix','bug','hotfix']
  const low = ['readme','docs','test','ci','build','chore']

  let score = 0
  const reasons = []

  files.forEach(f=>{
    const p = (f.filename || '').toLowerCase()
    for(const k of high){ if(p.includes(k)){ score += 5; reasons.push({file:p, reason:`alteração em área crítica: ${k}`}); return } }
    for(const k of medium){ if(p.includes(k)){ score += 2; reasons.push({file:p, reason:`possível impacto técnico: ${k}`}); return } }
    for(const k of low){ if(p.includes(k)){ score += 0; return } }
    if(p.match(/\.(c|cpp|rs|go|js|ts|py|java|sol)$/)){
      score += 1
      reasons.push({file:p, reason:'arquivo de código modificado'})
    }
  })

  return { score, reasons }
}

function explainCommit(commit, scoring){
  const msg = commit.commit && commit.commit.message ? commit.commit.message.split('\n')[0] : ''
  const author = commit.commit && commit.commit.author ? commit.commit.author.name : 'unknown'
  const date = commit.commit && commit.commit.author ? commit.commit.author.date : ''

  const topFiles = (scoring.reasons || []).slice(0,5).map(r=>`- ${r.file}: ${r.reason}`)

  const explanation = `Commit: ${msg}\nAutor: ${author}\nData: ${date}\nPontuação: ${scoring.score}\nArquivos relevantes:\n${topFiles.join('\n')}`

  return explanation
}

// Novo: analisar contratos encontrados usando contractRiskAgent
async function analyzeContractsInRepo(addresses, apiKey) {
  const results = [];
  if (!addresses || addresses.length === 0) return results;

  for (const addr of addresses) {
    try {
      console.log('[gitAgent] executando contractRiskAgent para', addr);
      const analysis = await contractRiskAgent.analyzeContract(addr, apiKey);
      results.push(analysis);
      console.log('[gitAgent] analysis result for', addr, JSON.stringify(analysis));
    } catch (err) {
      console.error('[gitAgent] erro ao analisar contrato', addr, err.message);
      results.push({ address: addr, error: err.message });
    }
  }

  return results;
}

// Export helper to run contract analysis from outside (jobs/test harness)
export const runContractAnalysisForFoundContracts = async function(addresses, apiKey) {
  return await analyzeContractsInRepo(addresses, apiKey);
};

function parseTrackedEnv(){
  const raw = String(process.env.GITHUB_REPOS || '').trim()
  if(!raw) return null

  const parsed = raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [key, value] = item.split('=').map(part => part?.trim())
      const repo = normalizeRepoPath(value)
      if(key && repo) acc[key.toUpperCase()] = repo
      return acc
    }, {})

  return Object.keys(parsed).length > 0 ? parsed : null
}

function normalizeRepoPath(value){
  const raw = String(value || '').trim()
  if(!raw || raw === 'manual') return ''

  const match = raw.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+\/[^/.#?]+)(?:\.git)?(?:[/?#].*)?$/i)
    || raw.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:\.git)?$/)

  return match ? match[1].replace(/\.git$/i, '') : ''
}

function normalizeScanInput(input){
  const envTracked = parseTrackedEnv()
  const baseTracked = envTracked || DEFAULT_TRACKED

  if(!input){
    return { tracked: baseTracked, commitLimit: Number(process.env.GITHUB_COMMIT_LIMIT || 5) }
  }

  if(typeof input === 'string'){
    const repo = normalizeRepoPath(input)
    return {
      tracked: repo ? { [repo]: repo } : baseTracked,
      commitLimit: Number(process.env.GITHUB_COMMIT_LIMIT || 5)
    }
  }

  if(input && typeof input === 'object'){
    const commitLimit = Number(input.commitLimit || input.limit || process.env.GITHUB_COMMIT_LIMIT || 5)
    const optionKeys = new Set(['tracked', 'repos', 'repo', 'repository', 'symbol', 'symbols', 'commitLimit', 'limit'])
    const looksLikeOptions = Object.keys(input).some(key => optionKeys.has(key))
    const singleRepo = normalizeRepoPath(input.repo || input.repository)

    if(singleRepo){
      const key = normalizeSymbol(input.symbol) || singleRepo
      return { tracked: { [key]: singleRepo }, commitLimit }
    }

    const rawTracked = input.tracked || input.repos || null
    if(rawTracked && typeof rawTracked === 'object' && !Array.isArray(rawTracked)){
      return { tracked: normalizeTrackedMap(rawTracked), commitLimit }
    }

    if(input.symbol){
      const symbol = normalizeSymbol(input.symbol)
      const repo = baseTracked[symbol]
      return {
        tracked: repo ? { [symbol]: repo } : { [symbol]: '' },
        commitLimit
      }
    }

    if(Array.isArray(input.symbols)){
      return {
        tracked: input.symbols.reduce((acc, item) => {
          const symbol = normalizeSymbol(item)
          if(symbol) acc[symbol] = baseTracked[symbol] || ''
          return acc
        }, {}),
        commitLimit
      }
    }

    if(looksLikeOptions){
      return { tracked: baseTracked, commitLimit }
    }

    return { tracked: normalizeTrackedMap(input), commitLimit }
  }

  return { tracked: baseTracked, commitLimit: Number(process.env.GITHUB_COMMIT_LIMIT || 5) }
}

function normalizeTrackedMap(value){
  const out = {}
  for(const [key, repoValue] of Object.entries(value || {})){
    const symbol = normalizeSymbol(key) || key
    const repo = normalizeRepoPath(repoValue)
    out[symbol] = repo
  }
  return out
}

function normalizeSymbol(value){
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9._-]/g, '')
}

function buildCommitSignals(item){
  const text = `${item.message || ''} ${(item.files || []).join(' ')}`.toLowerCase()
  const difficulties = difficultyTerms.filter(term => text.includes(term))
  const successes = successTerms.filter(term => text.includes(term))
  const score = Number(item.score || 0)

  return {
    difficulties: difficulties.length ? [{
      title: item.message?.split('\n')[0] || item.sha,
      url: item.url || '',
      type: 'commit',
      impact: score,
      impact_level: inferImpactLevel(score),
      terms: difficulties.slice(0, 5),
      meaning: 'Commit recente toca em termos de risco, correção ou instabilidade.'
    }] : [],
    successes: successes.length ? [{
      title: item.message?.split('\n')[0] || item.sha,
      url: item.url || '',
      type: 'commit',
      impact: score,
      impact_level: inferImpactLevel(score),
      terms: successes.slice(0, 5),
      meaning: 'Commit recente aponta entrega, melhoria ou manutenção positiva.'
    }] : []
  }
}

function inferImpactLevel(score){
  const value = Number(score || 0)
  if(value >= 30) return 'critical'
  if(value >= 20) return 'high'
  if(value >= 10) return 'medium'
  return 'low'
}

function buildRepoSummary(repo, analysed){
  const successful = analysed.filter(item => !item.error)
  const leadScore = Math.min(100, successful.reduce((sum, item) => sum + Number(item.score || 0), 0))
  const signals = successful.map(buildCommitSignals)
  const difficulties = signals.flatMap(item => item.difficulties).slice(0, 8)
  const successes = signals.flatMap(item => item.successes).slice(0, 8)
  const marketSignal = leadScore >= 35 ? 'strong_git_lead'
    : leadScore >= 12 ? 'watch'
      : 'quiet'

  return {
    repository: null,
    lead_score: leadScore,
    market_signal: successful.length > 0 ? marketSignal : 'unavailable',
    signal_summary: successful.length > 0
      ? `${repo} teve ${successful.length} commit(s) analisado(s), lead ${leadScore} e sinal ${marketSignal}.`
      : `${repo} não retornou commits analisáveis nesta execução.`,
    difficulties,
    successes,
    errors: analysed.filter(item => item.error).map(item => ({ area: 'commit', error: item.error, sha: item.sha }))
  }
}

async function fetchAbisFromCommit(detail){
  const abis = []
  try{
    const files = detail.files || []
    // extrair endereços 0x...40hex de patches e da mensagem
    const addrRe = /0x[a-fA-F0-9]{40}/g
    const found = new Set()

    if(detail.commit && detail.commit.message){
      const m = detail.commit.message.match(addrRe)
      if(m) m.forEach(a=>found.add(a))
    }

    for(const f of files){
      if(f.patch && typeof f.patch === 'string'){
        const m = f.patch.match(addrRe)
        if(m) m.forEach(a=>found.add(a))
      }
      // se arquivo solidity foi modificado, registrar filename
      if((f.filename || '').toLowerCase().endsWith('.sol')){
        abis.push({ file: f.filename, note: 'solidity file changed' })
      }
    }

    // consultar etherscan para cada endereço encontrado
    for(const addr of Array.from(found)){
      try{
        const res = await etherscan.getContractABI(addr)
        abis.push({ address: addr, abiResult: res })
      }catch(e){
        abis.push({ address: addr, error: e.message })
      }
    }
  }catch(e){
    // ignore
  }
  return abis
}

export async function scanRepos(input){
  const out = {}
  const { tracked, commitLimit } = normalizeScanInput(input)

  const entries = Object.entries(tracked)

  for(const [symbol, repo] of entries){
    if(!repo){
      out[symbol] = {
        repo: null,
        error: 'no GitHub repository found for this symbol',
        lead_score: 0,
        market_signal: 'unavailable',
        difficulties: [],
        successes: []
      }
      continue
    }

    try{
      const commits = await getCommits(repo, commitLimit)
      const analysed = []

      for(const c of commits){
        try{
          const detail = await getCommitDetail(repo, c.sha)
          const files = detail.files || []
          const scoring = scoreFiles(files)

          // tentar extrair ABIs/endereços relacionados
          const abis = await fetchAbisFromCommit(detail)

          const explanation = explainCommit(detail, scoring)

          analysed.push({ sha: c.sha, message: c.commit.message, author: c.commit.author, date: c.commit.author.date, url: c.html_url, files: files.map(f=>f.filename), score: scoring.score, explanation, abis })
        }catch(e){
          analysed.push({ sha: c.sha, error: e.message })
        }
      }

      // escolher commit com maior score
      analysed.sort((a,b)=> (b.score||0) - (a.score||0))

      out[symbol] = {
        repo,
        top: analysed[0] || null,
        recent: analysed,
        ...buildRepoSummary(repo, analysed)
      }

    }catch(e){
      out[symbol] = {
        repo,
        error: e.message,
        lead_score: 0,
        market_signal: 'unavailable',
        difficulties: [],
        successes: [],
        errors: [{ area: 'repository', error: e.message }]
      }
    }
  }

  return out
}

export default { scanRepos, runContractAnalysisForFoundContracts }
