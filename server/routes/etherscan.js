const express = require('express');
const router = express.Router();
const etherscan = require('../utils/etherscan_client');

router.get('/abi', async (req, res) => {
  const address = req.query.address;
  const apikey = req.query.apikey || process.env.ETHERSCAN_KEY || process.env.ETHERSCAN_API_KEY;

  if (!address) return res.status(400).json({ error: 'address query param required' });

  try {
    const abi = await etherscan.getContractABI(address, apikey);
    return res.json({ address, abi });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
