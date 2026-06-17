const etherscanClient = require('../utils/etherscan_client');

async function analyzeHolders(address, apiKey, options = {}) {
  const result = {
    address,
    holder_score: null,
    top10_concentration: null,
    whale_risk: 'unknown',
    top_holders: [],
    confidence: 0,
    analyzed_at: new Date().toISOString()
  };

  if (!apiKey) {
    result.confidence = 5;
    result.message = 'ETHERSCAN API key not provided';
    return result;
  }

  try {
    const holdersRaw = await etherscanClient.getTokenHolders(address, apiKey);
    if (!holdersRaw || holdersRaw.length === 0) {
      result.confidence = 20;
      result.message = 'no holder data available';
      return result;
    }

    const holders = holdersRaw.map(h => {
      const balance = Number(h.balance || 0);
      return { address: h.address || h.holder || h.Account || null, balance };
    }).filter(h => h.address);

    const total = holders.reduce((s, h) => s + (h.balance || 0), 0);
    const top10 = holders.slice(0, 10);
    const top10sum = top10.reduce((s, h) => s + (h.balance || 0), 0);
    const top10_concentration = total > 0 ? (top10sum / total) * 100 : null;

    let whale_risk = 'LOW';
    if (top10_concentration === null) whale_risk = 'unknown';
    else if (top10_concentration >= 50) whale_risk = 'HIGH';
    else if (top10_concentration >= 20) whale_risk = 'MEDIUM';

    const holder_score = top10_concentration === null ? null : Math.max(0, Math.min(100, Math.round(100 - top10_concentration)));

    result.top_holders = top10;
    result.top10_concentration = top10_concentration;
    result.holder_score = holder_score;
    result.whale_risk = whale_risk;
    result.confidence = 80;

    return result;
  } catch (err) {
    console.error('[HolderAnalysis] request failed', err.message);
    result.confidence = 5;
    result.message = err.message;
    return result;
  }
}

module.exports = {
  analyzeHolders
};
