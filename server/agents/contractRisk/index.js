export function analyzeContract(abi, address){
  const a = Array.isArray(abi) ? abi : (typeof abi === 'string' ? JSON.parse(abi) : [])

  const fnNames = (a.filter(x=>x.type==='function').map(f=>f.name || '').map(n=>n.toLowerCase()))
  const events = (a.filter(x=>x.type==='event').map(e=>e.name || '').map(n=>n.toLowerCase()))

  const reasons = []
  let score = 0

  // Detect mint/burn
  if(fnNames.some(n=>n.includes('mint'))){ score += 30; reasons.push('mint function detected') }
  if(fnNames.some(n=>n.includes('burn'))){ score += 10; reasons.push('burn function detected') }

  // Owner / privileged control
  if(fnNames.some(n=>['owner','transferownership','renounceownership','setowner','setowneraddress'].some(k=>n.includes(k)))){
    score += 20; reasons.push('ownership control functions detected')
  }
  if(fnNames.some(n=>n.includes('set') && (n.includes('blacklist') || n.includes('blocked') || n.includes('exclude')))){
    score += 25; reasons.push('blacklist/set privileged list detected')
  }

  // Pausable
  if(fnNames.some(n=>n.includes('pause') || n.includes('paused')) || events.some(e=>e.includes('paused'))){
    score += 5; reasons.push('pausable contract patterns detected')
  }

  // Upgradeable / proxy patterns
  if(fnNames.some(n=>n.includes('upgrade') || n.includes('upgradeTo') || fnNames.includes('proxiableuuid'))){
    score += 30; reasons.push('upgradeable/proxy pattern detected')
  }

  // Admin mint via role patterns
  if(fnNames.some(n=>n.includes('grantrole') || n.includes('revokerole') || n.includes('hasrole'))){
    score += 15; reasons.push('role-based admin functions detected')
  }

  // Check large owner power: functions like setFee/setTax
  if(fnNames.some(n=>n.includes('fee') || n.includes('tax') || n.includes('burnrate'))){
    score += 10; reasons.push('admin fee/tax functions detected')
  }

  // Renounce ownership is protective (lowers risk)
  if(fnNames.some(n=>n.includes('renounceownership'))){ score -= 10; reasons.push('renounceOwnership detected (decreases centralization risk)') }

  // Normalize score
  if(score < 0) score = 0

  let level = 'low'
  if(score >= 40) level = 'high'
  else if(score >= 15) level = 'medium'

  return {
    address: address || null,
    score,
    level,
    reasons,
    indicators:{ functions: fnNames.slice(0,20), events: events.slice(0,20) }
  }
}

export default { analyzeContract }
