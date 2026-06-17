const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Monta rota etherscan existente
try {
  const etherscanRouter = require('./routes/etherscan');
  app.use('/etherscan', etherscanRouter);
  console.log('[start_local_server_for_debug] mounted /etherscan routes');
} catch (err) {
  console.error('[start_local_server_for_debug] could not mount /etherscan route:', err.message);
}

// Health endpoint com métricas do etherscan
try {
  const etherscanClient = require('./utils/etherscan_client');
  app.get('/health', (req, res) => {
    const em = etherscanClient.getMetrics();
    const contractRiskMetrics = {
      contractsAnalyzed: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0
    };
    res.json({ etherscan: em, contractRisk: contractRiskMetrics });
  });
  console.log('[start_local_server_for_debug] /health endpoint available');
} catch (err) {
  app.get('/health', (req, res) => res.json({ status: 'no-metrics' }));
}

app.listen(port, () => {
  console.log(`Debug server listening at http://localhost:${port}`);
  console.log('Try: GET /etherscan/abi?address=0x...&apikey=YOUR_KEY');
});
