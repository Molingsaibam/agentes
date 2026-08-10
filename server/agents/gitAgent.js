import axios from 'axios'

const API = 'https://api.github.com'

const DEFAULT_TRACKED = {
  ZEC: 'zcash/zcash',
  ETH: 'ethereum/go-ethereum',
  LINK: 'smartcontractkit/chainlink'
}

const CODE_EXTENSIONS = /\.(c|cc|cpp|h|hpp|rs|go|js|jsx|ts|tsx|py|java|kt|swift|sol|rb|php)$/i
const CRITICAL_PATHS = /(consensus|protocol|core|crypto|cryptography|wallet|bridge|validator|node|p2p|zk|rollup|contract|contracts|src|lib)/i
const SECURITY_TERMS = /(security|vuln|cve|exploit|attack|patch|fix|hotfix|auth|permission|privilege|secret|token)/i

function makeHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': process.env.GITHUB_AGENT_USER_AGENT || 'market-agents-github-agent',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

function normalizeRepo(value) {
  if (!value) return null
  const text = String(value).trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '')
  return /^[^/\s]+\/[^/\s]+$/.test(text) ? text : null
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0))
}

function safeDate(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function scoreFiles(files = []) {
  let impact = 0
  let security = 0
  const reasons = []

  for (const file of files) {
    const path = String(file?.filename || '').toLowerCase()
    const additions = Number(file?.additions || 0)
    const deletions = Number(file?.deletions || 0)
    const churn = additions + deletions

    if (CRITICAL_PATHS.test(path)) {
      impact += 7
      reasons.push({ file: path, reason: 'área crítica do projeto', weight: 7 })
    } else if (CODE_EXTENSIONS.test(path)) {
      impact += 3
      reasons.push({ file: path, reason: 'código-fonte alterado', weight: 3 })
    }

    if (SECURITY_TERMS.test(path)) {
      security += 8
      reasons.push({ file: path, reason: 'indicador relacionado a segurança', weight: 8 })
    }

    if (churn >= 500) impact += 3
    else if (churn >= 100) impact += 1
  }

  return {
    impact: clamp(impact, 0, 100),
    security: clamp(security, 0, 100),
    reasons: reasons.slice(0, 20)
  }
}

function classifyCommit(commit, fileScore) {
  const message = String(commit?.commit?.message || '').split('\n')[0]
  const lower = message.toLowerCase()
  let category = 'maintenance'

  if (/(security|cve|vuln|exploit|attack|permission)/i.test(lower)) category = 'security'
  else if (/(fix|bug|hotfix|patch)/i.test(lower)) category = 'bugfix'
  else if (/(feat|feature|add|implement)/i.test(lower)) category = 'feature'
  else if (/(refactor|architecture|cleanup|simplify)/i.test(lower)) category = 'refactor'
  else if (/(release|version|tag)/i.test(lower)) category = 'release'

  const importance = clamp(
    fileScore.impact + fileScore.security + (category === 'security' ? 15 : category === 'bugfix' ? 8 : 0),
    0,
    100
  )

  return { category, importance }
}

function buildRisk(summary) {
  const score = clamp(
    summary.security * 0.5 + summary.criticalChanges * 4 + summary.bugfixes * 2 + summary.largeChanges * 2,
    0,
    100
  )

  let level = 'low'
  if (score >= 70) level = 'critical'
  else if (score >= 45) level = 'high'
  else if (score >= 20) level = 'medium'

  return { score: Math.round(score), level }
}

async function githubGet(path, params = {}) {
  const response = await axios.get(`${API}${path}`, {
    headers: makeHeaders(),
    params,
    timeout: Number(process.env.GITHUB_AGENT_TIMEOUT_MS || 15000),
    validateStatus: status => status >= 200 && status < 300
  })
  return response.data
}

async function getRepo(repo) {
  return githubGet(`/repos/${repo}`)
}

async function getCommits(repo, perPage = 10) {
  return githubGet(`/repos/${repo}/commits`, { per_page: clamp(perPage, 1, 100) })
}

async function getCommitDetail(repo, sha) {
  return githubGet(`/repos/${repo}/commits/${sha}`)
}

async function getIssues(repo, perPage = 10) {
  return githubGet(`/repos/${repo}/issues`, {
    state: 'open',
    per_page: clamp(perPage, 1, 100),
    sort: 'updated',
    direction: 'desc'
  })
}

async function getPullRequests(repo, perPage = 10) {
  return githubGet(`/repos/${repo}/pulls`, {
    state: 'open',
    per_page: clamp(perPage, 1, 100),
    sort: 'updated',
    direction: 'desc'
  })
}

async function getReleases(repo, perPage = 5) {
  return githubGet(`/repos/${repo}/releases`, { per_page: clamp(perPage, 1, 100) })
}

async function getForks(repo, perPage = 5) {
  return githubGet(`/repos/${repo}/forks`, {
    per_page: clamp(perPage, 1, 100),
    sort: 'newest'
  })
}

async function searchRepositories(query, perPage = 10) {
  const data = await githubGet('/search/repositories', {
    q: query,
    per_page: clamp(perPage, 1, 100),
    sort: 'stars',
    order: 'desc'
  })
  return data.items || []
}

function mapIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    labels: (issue.labels || []).map(label => label.name),
    comments: issue.comments || 0,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    url: issue.html_url,
    pullRequest: Boolean(issue.pull_request)
  }
}

function mapPullRequest(pr) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: Boolean(pr.draft),
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    updatedAt: pr.updated_at,
    url: pr.html_url,
    author: pr.user?.login || null
  }
}

function mapRelease(release) {
  return {
    tag: release.tag_name,
    name: release.name,
    prerelease: Boolean(release.prerelease),
    draft: Boolean(release.draft),
    publishedAt: release.published_at,
    url: release.html_url
  }
}

function buildRepositoryHealth(repo, commits, issues, pullRequests, releases) {
  const openIssues = issues.filter(item => !item.pullRequest)
  const openPRs = pullRequests
  const staleIssues = openIssues.filter(item => {
    const date = safeDate(item.updatedAt)
    return date && Date.now() - date.getTime() > 30 * 24 * 60 * 60 * 1000
  }).length

  const latestRelease = releases
    .map(item => safeDate(item.publishedAt))
    .filter(Boolean)
    .sort((a, b) => b - a)[0]

  let score = 100
  if (repo.archived) score -= 50
  if (repo.disabled) score -= 40
  if (openIssues.length > 50) score -= 10
  if (staleIssues > 20) score -= 10
  if (openPRs.length > 30) score -= 5
  if (!latestRelease || Date.now() - latestRelease.getTime() > 365 * 24 * 60 * 60 * 1000) score -= 5

  return {
    score: clamp(Math.round(score), 0, 100),
    archived: Boolean(repo.archived),
    openIssues: openIssues.length,
    openPullRequests: openPRs.length,
    staleIssues,
    latestRelease: latestRelease?.toISOString() || null
  }
}

async function analyzeCommit(repo, commit) {
  const detail = await getCommitDetail(repo, commit.sha)
  const fileScore = scoreFiles(detail.files || [])
  const classification = classifyCommit(detail, fileScore)

  return {
    sha: detail.sha,
    message: detail.commit?.message || '',
    author: detail.commit?.author?.name || detail.author?.login || 'unknown',
    date: detail.commit?.author?.date || null,
    url: detail.html_url,
    category: classification.category,
    importance: classification.importance,
    impact: fileScore.impact,
    security: fileScore.security,
    files: (detail.files || []).map(file => ({
      path: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes
    })),
    reasons: fileScore.reasons
  }
}

async function analyzeRepository(repo, options = {}) {
  const normalized = normalizeRepo(repo)
  if (!normalized) throw new Error(`invalid GitHub repository: ${repo}`)

  const commitLimit = clamp(options.commitLimit ?? 10, 1, 30)
  const issueLimit = clamp(options.issueLimit ?? 10, 1, 30)
  const releaseLimit = clamp(options.releaseLimit ?? 5, 1, 20)
  const forkLimit = clamp(options.forkLimit ?? 5, 1, 20)

  const repository = await getRepo(normalized)
  const [rawCommits, rawIssues, rawPRs, rawReleases] = await Promise.all([
    getCommits(normalized, commitLimit),
    options.includeIssues === false ? [] : getIssues(normalized, issueLimit),
    options.includePullRequests === false ? [] : getPullRequests(normalized, issueLimit),
    options.includeReleases === false ? [] : getReleases(normalized, releaseLimit)
  ])

  const analyzedCommits = []
  for (const commit of rawCommits) {
    try {
      analyzedCommits.push(await analyzeCommit(normalized, commit))
    } catch (error) {
      analyzedCommits.push({ sha: commit.sha, error: error.message })
    }
  }

  const summary = {
    security: analyzedCommits.reduce((sum, item) => sum + Number(item.security || 0), 0) / Math.max(analyzedCommits.length, 1),
    criticalChanges: analyzedCommits.filter(item => Number(item.impact) >= 20).length,
    bugfixes: analyzedCommits.filter(item => item.category === 'bugfix').length,
    largeChanges: analyzedCommits.filter(item => (item.files || []).reduce((sum, f) => sum + Number(f.changes || 0), 0) >= 500).length
  }

  const issues = (rawIssues || []).map(mapIssue)
  const pullRequests = (rawPRs || []).map(mapPullRequest)
  const releases = (rawReleases || []).map(mapRelease)
  const risk = buildRisk(summary)
  const health = buildRepositoryHealth(repository, analyzedCommits, issues, pullRequests, releases)

  const result = {
    repository: {
      fullName: repository.full_name,
      name: repository.name,
      owner: repository.owner?.login,
      description: repository.description,
      language: repository.language,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      openIssues: repository.open_issues_count,
      defaultBranch: repository.default_branch,
      archived: repository.archived,
      url: repository.html_url,
      pushedAt: repository.pushed_at,
      createdAt: repository.created_at
    },
    health,
    risk,
    activity: {
      commitsAnalyzed: analyzedCommits.length,
      openIssues: issues.length,
      openPullRequests: pullRequests.length,
      releases: releases.length
    },
    commits: analyzedCommits.sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0)),
    issues,
    pullRequests,
    releases
  }

  if (options.includeForks) {
    const forks = await getForks(normalized, forkLimit)
    result.forks = forks.map(fork => ({
      fullName: fork.full_name,
      stars: fork.stargazers_count,
      forks: fork.forks_count,
      updatedAt: fork.pushed_at,
      url: fork.html_url
    }))
  }

  return result
}

async function discoverRepos(query, limit = 10) {
  if (!query) return []
  const repos = await searchRepositories(query, limit)
  return repos.map(repo => ({
    fullName: repo.full_name,
    description: repo.description,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language,
    url: repo.html_url
  }))
}

export async function scanRepos(tracked = DEFAULT_TRACKED, options = {}) {
  // Mantém compatibilidade com o runtime antigo: scanRepos({ ... })
  if (tracked && typeof tracked === 'object' && (tracked.tracked || tracked.repos || tracked.discover || tracked.commitLimit)) {
    options = tracked
    tracked = options.tracked || options.repos || DEFAULT_TRACKED
  }

  let entries = []
  if (Array.isArray(tracked)) {
    entries = tracked.map(repo => [normalizeRepo(repo), normalizeRepo(repo)]).filter(([key]) => key)
  } else if (typeof tracked === 'string') {
    const repo = normalizeRepo(tracked)
    if (repo) entries = [[repo, repo]]
  } else if (tracked && typeof tracked === 'object') {
    entries = Object.entries(tracked)
      .map(([symbol, repo]) => [symbol, normalizeRepo(repo)])
      .filter(([, repo]) => repo)
  }

  if (options.discover) {
    const query = typeof options.discover === 'string' ? options.discover : options.symbol || options.symbols
    const discoveries = await discoverRepos(query, options.discoveryLimit || 10)
    for (const repo of discoveries) {
      if (!entries.some(([, value]) => value === repo.fullName)) entries.push([repo.fullName, repo.fullName])
    }
  }

  if (entries.length === 0) entries = Object.entries(DEFAULT_TRACKED)

  const results = {}
  for (const [key, repo] of entries) {
    try {
      results[key] = await analyzeRepository(repo, options)
    } catch (error) {
      results[key] = { repository: { fullName: repo }, error: error.message }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    count: Object.keys(results).length,
    results
  }
}

export { analyzeRepository, discoverRepos, scoreFiles, classifyCommit, normalizeRepo }

export default {
  scanRepos,
  analyzeRepository,
  discoverRepos
}
