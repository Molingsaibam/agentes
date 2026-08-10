import assert from 'node:assert/strict'
import {
  normalizeRepo,
  scoreFiles,
  classifyCommit
} from './server/agents/gitAgent.js'

assert.equal(normalizeRepo('https://github.com/ethereum/go-ethereum.git'), 'ethereum/go-ethereum')
assert.equal(normalizeRepo('ethereum/go-ethereum'), 'ethereum/go-ethereum')
assert.equal(normalizeRepo('not-a-repo'), null)

const score = scoreFiles([
  { filename: 'core/consensus/engine.go', additions: 20, deletions: 5 },
  { filename: 'README.md', additions: 5, deletions: 1 },
  { filename: 'security/fix_auth.ts', additions: 10, deletions: 2 }
])

assert.ok(score.impact > 0)
assert.ok(score.security > 0)
assert.ok(score.reasons.length > 0)

const classification = classifyCommit(
  { commit: { message: 'fix: patch authentication vulnerability' } },
  { impact: 20, security: 8 }
)

assert.equal(classification.category, 'security')
assert.ok(classification.importance > 20)

console.log('GitHub Agent helper tests: OK')
