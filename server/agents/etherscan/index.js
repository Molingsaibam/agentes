import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_PATH = path.join(process.cwd(), 'server', 'database', 'etherscan_cache.json')

function readCache(){
  try{
    const raw = fs.readFileSync(CACHE_PATH, 'utf8')
    return JSON.parse(raw)
  }catch(e){
    return {}
  }
}

function writeCache(obj){
  try{
    fs.writeFileSync(CACHE_PATH, JSON.stringify(obj, null, 2), 'utf8')
  }catch(e){ /* ignore */ }
}

export async function getContractABI(address){
  if(!address) throw new Error('address required')
  const addr = String(address).trim()

  // checar cache
  const cache = readCache()
  if(cache[addr]){
    return { ok:true, from:'cache', abi: cache[addr] }
  }

  const key = process.env.ETHERSCAN_KEY || process.env.ETHERSCAN_API_KEY || ''
// [ETHERSCAN-AUTOREPLACE] Original line removed. Use etherscan_client helper below and adapt variable names.
//   const url = `https://api.etherscan.io/api`
// Suggested replacement (example):
// const etherscanClient = require('../server/utils/etherscan_client');
// // for ABI: const abi = await etherscanClient.getContractABI(address, process.env.ETHERSCAN_KEY);
// // for holders: const holders = await etherscanClient.getTokenHolders(address, process.env.ETHERSCAN_KEY);
// [ETHERSCAN-AUTOREPLACE-END]

  const params = {
    module: 'contract',
// [ETHERSCAN-AUTOREPLACE] Original line removed. Use etherscan_client helper below and adapt variable names.
//     action: 'getabi',
// Suggested replacement (example):
// const etherscanClient = require('../server/utils/etherscan_client');
// // for ABI: const abi = await etherscanClient.getContractABI(address, process.env.ETHERSCAN_KEY);
// // for holders: const holders = await etherscanClient.getTokenHolders(address, process.env.ETHERSCAN_KEY);
// [ETHERSCAN-AUTOREPLACE-END]
    address: addr
  }
  if(key) params.apikey = key

  try{
    const res = await axios.get(url, { params, timeout: 10000 })
    const data = res.data
    // Etherscan returns: { status: "1", message: "OK", result: "[...]" } or status "0" with result message
    if(!data) return { ok:false, error:'no response from etherscan' }

    if(data.status === '1' && data.result){
      let abi = null
      try{ abi = JSON.parse(data.result) }catch(e){ abi = data.result }
      // gravar cache
      cache[addr] = abi
      writeCache(cache)
      return { ok:true, from:'etherscan', abi }
    }

    // tratar erro retornado
    const err = data.result || data.message || 'etherscan error'
    return { ok:false, error: String(err) }
  }catch(e){
    return { ok:false, error: e.message || 'request failed' }
  }
}

export default { getContractABI }
