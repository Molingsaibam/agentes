const etherscan = require('../utils/etherscan_client');

function _containsName(names, kw) {
  if (!names || names.length === 0) return false;
  return names.some(n => n && n.toLowerCase().includes(kw.toLowerCase()));
}

function _collectFunctionNames(abi) {
  try {
    return (abi || []).filter(e => e.type === 'function' && e.name).map(f => f.name);
  } catch (err) {
    return [];
  }
}

function _detectFindings(abi) {
  const findings = [];
  const fnNames = _collectFunctionNames(abi);

  if (_containsName(fnNames, 'mint')) findings.push('mint');
  if (_containsName(fnNames, 'burn')) findings.push('burn');
  if (_containsName(fnNames, 'pause') || _containsName(fnNames, 'unpause')) findings.push('pauseable');
  if (_containsName(fnNames, 'blacklist') || _containsName(fnNames, 'isBlacklisted')) findings.push('blacklist');
  if (_containsName(fnNames, 'upgradeTo') || _containsName(fnNames, 'upgrade') || _containsName(fnNames, 'implementation') || _containsName(fnNames, 'initialize') || _containsName(fnNames, 'proxi')) findings.push('proxy/upgradeable');
  if (_containsName(fnNames, 'delegatecall') || _containsName(fnNames, 'delegate_call')) findings.push('delegatecall');

  // ownership detection
  if (_containsName(fnNames, 'owner') || _containsName(fnNames, 'transferOwnership') || _containsName(fnNames, 'renounce')) {
    if (_containsName(fnNames, 'renounce')) {
      findings.push('ownership_renounced');
    } else {
      findings.push('ownership_controlled');
    }
  }

  // fallback/receive payable
  const hasFallback = (abi || []).some(e => e.type === 'fallback' || e.type === 'receive');
  if (hasFallback) findings.push('fallback_receive');

  return findings;
}

function _computeScore(findings) {
  // weights per rules suggested
  const weights = {
    mint: 25,
    blacklist: 30,
    pauseable: 15,
    'proxy/upgradeable': 10,
    upgrade: 10,
    ownership_controlled: 15,
    ownership_renounced: -10,
    delegatecall: 20,
    fallback_receive: 20
  };

  let score = 0;
  const reasons = [];

  findings.forEach(f => {
    if (f === 'mint') { score += weights.mint; reasons.push('função mint detectada'); }
    if (f === 'burn') { /* burn not increase risk by default */ }
    if (f === 'pauseable') { score += weights.pauseable; reasons.push('contrato pausável detectado'); }
    if (f === 'blacklist') { score += weights.blacklist; reasons.push('mecanismo de blacklist detectado'); }
    if (f === 'proxy/upgradeable') { score += weights['proxy/upgradeable']; reasons.push('proxy/upgrade pattern detectado'); }
    if (f === 'delegatecall') { score += weights.delegatecall; reasons.push('uso potencial de delegatecall detectado'); }
    if (f === 'ownership_controlled') { score += weights.ownership_controlled; reasons.push('controle por owner detectado'); }
    if (f === 'ownership_renounced') { score += weights.ownership_renounced; reasons.push('ownership parece renunciado'); }
    if (f === 'fallback_receive') { score += weights.fallback_receive; reasons.push('fallback/receive presente (payable)'); }
  });

  // clamp
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let level = 'low';
  if (score >= 70) level = 'high';
  else if (score >= 30) level = 'medium';

  return { score, level, reasons };
}

async function analyzeContract(address, apiKey, options = {}) {
  if (!address) throw new Error('address is required');

  const result = {
    address,
    contract_score: 0,
    risk: 'unknown',
    findings: [],
    reasons: [],
    abi: null,
    analyzed_at: new Date().toISOString()
  };

  try {
    const abi = await etherscan.getContractABI(address, apiKey, options);
    result.abi = abi;

    if (!abi || !Array.isArray(abi) || abi.length === 0) {
      result.reasons.push('ABI vazia ou contrato não verificado');
      result.risk = 'unknown';
      return result;
    }

    const findings = _detectFindings(abi);
    result.findings = findings;

    const scoreObj = _computeScore(findings);
    result.contract_score = scoreObj.score;
    result.reasons = scoreObj.reasons;
    result.risk = scoreObj.level;

    return result;
  } catch (err) {
    console.error('[ContractRiskAgent] erro ao analisar contrato', err.message);
    result.reasons.push('erro ao obter ABI: ' + err.message);
    result.risk = 'error';
    return result;
  }
}

module.exports = {
  analyzeContract
};
