import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const patterns = [
// [ETHERSCAN-AUTOREPLACE] Original line removed. Use etherscan_client helper below and adapt variable names.
//   'etherscan.io',
// Suggested replacement (example):
// const etherscanClient = require('../server/utils/etherscan_client');
// // for ABI: const abi = await etherscanClient.getContractABI(address, process.env.ETHERSCAN_KEY);
// // for holders: const holders = await etherscanClient.getTokenHolders(address, process.env.ETHERSCAN_KEY);
// [ETHERSCAN-AUTOREPLACE-END]
// [ETHERSCAN-AUTOREPLACE] Original line removed. Use etherscan_client helper below and adapt variable names.
//   'api.etherscan',
// Suggested replacement (example):
// const etherscanClient = require('../server/utils/etherscan_client');
// // for ABI: const abi = await etherscanClient.getContractABI(address, process.env.ETHERSCAN_KEY);
// // for holders: const holders = await etherscanClient.getTokenHolders(address, process.env.ETHERSCAN_KEY);
// [ETHERSCAN-AUTOREPLACE-END]
// [ETHERSCAN-AUTOREPLACE] Original line removed. Use etherscan_client helper below and adapt variable names.
//   'tokenholderlist',
// Suggested replacement (example):
// const etherscanClient = require('../server/utils/etherscan_client');
// // for ABI: const abi = await etherscanClient.getContractABI(address, process.env.ETHERSCAN_KEY);
// // for holders: const holders = await etherscanClient.getTokenHolders(address, process.env.ETHERSCAN_KEY);
// [ETHERSCAN-AUTOREPLACE-END]
// [ETHERSCAN-AUTOREPLACE] Original line removed. Use etherscan_client helper below and adapt variable names.
//   'getabi',
// Suggested replacement (example):
// const etherscanClient = require('../server/utils/etherscan_client');
// // for ABI: const abi = await etherscanClient.getContractABI(address, process.env.ETHERSCAN_KEY);
// // for holders: const holders = await etherscanClient.getTokenHolders(address, process.env.ETHERSCAN_KEY);
// [ETHERSCAN-AUTOREPLACE-END]
  'module:\s*"contract"',
  'module:\s*"token"'
];

function scanDir(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git'].includes(e.name)) continue;
      results.push(...scanDir(full));
    } else if (e.isFile()) {
      if (!full.endsWith('.js') && !full.endsWith('.mjs') && !full.endsWith('.ts')) continue;
      const text = fs.readFileSync(full, 'utf8');
      const matches = [];
      for (const p of patterns) {
        const re = new RegExp(p, 'i');
        if (re.test(text)) matches.push(p);
      }
      if (matches.length) {
        results.push({ file: full, matches });
      }
    }
  }
  return results;
}

console.log('Scanning project for direct Etherscan usages...');
const found = scanDir(root);
if (found.length === 0) {
  console.log('Nenhuma ocorrência direta encontrada.');
  process.exit(0);
}
for (const f of found) {
  console.log('\nFile:', f.file);
  console.log('Matches:', f.matches.join(', '));
  try {
    const lines = fs.readFileSync(f.file, 'utf8').split(/\r?\n/);
    for (let i=0;i<lines.length;i++) {
      const L = lines[i];
      for (const p of patterns) {
        if (new RegExp(p, 'i').test(L)) {
          const num = i+1;
          const snippet = L.trim();
          console.log(`  ${num}: ${snippet}`);
        }
      }
    }
  } catch (err) {
    // ignore
  }
}

console.log('\nScan complete. Use these locations to replace direct calls with server/utils/etherscan_client.js functions.');
