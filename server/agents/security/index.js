export async function validateSecurity(symbol){
  const normalized = String(symbol || '').trim().toUpperCase()

  if(!normalized){
    throw new Error('symbol required')
  }

  if(normalized.length > 16){
    throw new Error('symbol too long')
  }

  const blocked = [
    '<SCRIPT>',
    'DROP TABLE',
    '../',
    'SELECT *',
    '--',
    ';',
    '${',
    '%00'
  ]

  const invalid = blocked.some(term=> normalized.includes(term))

  if(invalid){
    throw new Error('invalid symbol')
  }

  const ok = /^[A-Z0-9._-]+$/.test(normalized)

  if(!ok) throw new Error('invalid symbol')

  return {
    status:'secure',
    symbol: normalized,
    checked_at:new Date().toISOString()
  }
}
