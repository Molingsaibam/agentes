/**
 * Shared health check utility.
 * Returns a standardised health payload for any agent.
 */

const { version } = JSON.parse(
  await import('fs').then(fs => fs.promises.readFile(new URL('../../../package.json', import.meta.url), 'utf-8'))
)

const startedAt = Date.now()

/**
 * @param {string} agentName
 * @returns {object} health payload
 */
export function buildHealthPayload(agentName) {
  const mem = process.memoryUsage()

  const fmt = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`

  return {
    status: 'online',
    agent: agentName,
    version,
    uptime: parseFloat(((Date.now() - startedAt) / 1000).toFixed(1)),
    memory: {
      rss: fmt(mem.rss),
      heapUsed: fmt(mem.heapUsed),
      heapTotal: fmt(mem.heapTotal)
    },
    timestamp: new Date().toISOString()
  }
}
