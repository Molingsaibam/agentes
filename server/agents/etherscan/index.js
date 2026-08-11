import etherscanClient from '../../utils/etherscan_client.js'

function resolveApiKey(apiKey){
  return apiKey || process.env.ETHERSCAN_KEY || process.env.ETHERSCAN_API_KEY || ''
}

export async function getContractABI(address, apiKey, options = {}){
  if(!address) throw new Error('address required')
  const addr = String(address).trim()

  try{
    const abi = await etherscanClient.getContractABI(addr, resolveApiKey(apiKey), options)
    return { ok:true, from:'etherscan_client', abi }
  }catch(e){
    return { ok:false, error: e && e.message ? e.message : String(e) }
  }
}

export default { getContractABI }
