import { collectCoinData } from './server/agents/collector/index.js'
import { filterNews } from './server/agents/filter/index.js'
import { sentimentAnalysis } from './server/agents/sentiment/index.js'
import { validateSecurity } from './server/agents/security/index.js'
import gitAgent from './server/agents/gitAgent.js'

async function main(){
  const symbol = process.argv[2] || 'BTC'

  console.log('=== Teste de agentes para symbol =', symbol)

  try{
    console.log('\n-> Security:')
    const sec = await validateSecurity(symbol)
    console.log(sec)
  }catch(e){
    console.error('Security error:', e.message)
    process.exitCode = 1
    return
  }

  try{
    console.log('\n-> Collector: buscando notícias (pode demorar)...')
    const coin = await collectCoinData(symbol)
    console.log('Coletado:', coin.news.length, 'itens')

    console.log('\n-> Filter: aplicando filtro')
    const filtered = filterNews(coin.news)
    console.log('Após filtro:', filtered.length, 'itens')

    console.log('\n-> Sentiment: analisando sentimento')
    const sentiment = sentimentAnalysis(filtered)
    console.log('Resultado sentiment:', sentiment)

    console.log('\n-> Git Agent: rodando scan em repositórios padrão (pode demorar e pode exigir API rate limits)')
    const gitRes = await gitAgent.scanRepos()
    console.log(JSON.stringify(gitRes, null, 2))

    // Preparar jobResult e anexar resultados básicos
    const jobResult = {}
    jobResult.security = sec
    jobResult.coin = coin
    jobResult.filtered = filtered
    jobResult.sentiment = sentiment
    jobResult.git = gitRes

    // Extrair possíveis endereços de contrato do retorno do gitAgent
    function extractAddresses(obj) {
      const found = new Set()
      function recurse(v) {
        if (!v) return
        if (typeof v === 'string') {
          const m = v.match(/^0x[a-fA-F0-9]{40}$/)
          if (m) found.add(v)
        } else if (Array.isArray(v)) {
          for (const it of v) recurse(it)
        } else if (typeof v === 'object') {
          for (const k of Object.keys(v)) recurse(v[k])
        }
      }
      recurse(obj)
      return Array.from(found)
    }

    const etherscanKey = process.env.ETHERSCAN_KEY || process.env.ETHERSCAN_API_KEY || process.env.ETHERSCAN
    let addresses = extractAddresses(gitRes || {})
    if ((!addresses || addresses.length === 0) && process.env.CONTRACT_ADDRESSES) {
      addresses = process.env.CONTRACT_ADDRESSES.split(',').map(s=>s.trim()).filter(Boolean)
    }

    if (addresses && addresses.length > 0) {
      console.log(`[ContractRisk] iniciando análise automática de ${addresses.length} contratos encontrados`)
      try {
        const analyses = await gitAgent.runContractAnalysisForFoundContracts(addresses, etherscanKey)
        jobResult.contract_analysis = analyses
        jobResult.contract_risk_count = analyses.filter(a=>a.contract_score && a.contract_score > 0).length
        console.log('[ContractRisk] análises concluídas:', JSON.stringify(analyses, null, 2))

        // Integrar HolderAnalysisAgent para cada análise
        try {
          const holderAgent = require('./server/agents/holderAnalysisAgent');
          for (let i=0;i<jobResult.contract_analysis.length;i++) {
            const ca = jobResult.contract_analysis[i]
            try {
              const ha = await holderAgent.analyzeHolders(ca.address, etherscanKey)
              ca.holder_analysis = ha
            } catch(herr) {
              console.error('[HolderAnalysis] erro para', ca.address, herr.message)
            }
          }
          console.log('[HolderAnalysis] análises anexadas')
        } catch (he) {
          console.log('[HolderAnalysis] agente não disponível, pulando')
        }
      } catch (err) {
        console.error('[ContractRisk] erro ao executar análise de contratos:', err.message)
      }
    } else {
      console.log('[ContractRisk] nenhum endereço de contrato detectado no resultado do gitAgent')
    }

  }catch(e){
    console.error('Erro ao executar agentes:', e && e.message)
    process.exitCode = 2
    return
  }

  console.log('\nTeste concluído.')
}

main()

// ContractRiskAgent integration (non-invasive): if test script exposes contractsFound/global.contracts or env CONTRACT_ADDRESSES, analyze them automatically
;(async () => {
  try {
    const path = require('path');
    const contractAgentPath = path.resolve(__dirname, 'server', 'agents', 'contractRiskAgent.js');
    let contractAgent = null;
    try { contractAgent = require(contractAgentPath); } catch (e) { /* agent not available, skip */ }

    if (!contractAgent) {
      console.log('[ContractRisk] contractRiskAgent not found, skipping integration');
      return;
    }

    const etherscanKey = process.env.ETHERSCAN_KEY || process.env.ETHERSCAN_API_KEY || process.env.ETHERSCAN;

    // Try to gather addresses from common places: global variables or env
    let addresses = [];
    if (global.contractsFound && Array.isArray(global.contractsFound)) { addresses = global.contractsFound }
    else if (global.contracts && Array.isArray(global.contracts)) { addresses = global.contracts }
    else if (process.env.CONTRACT_ADDRESSES) { addresses = process.env.CONTRACT_ADDRESSES.split(',').map(s=>s.trim()).filter(Boolean) }

    if (!addresses || addresses.length === 0) {
      console.log('[ContractRisk] nenhum contrato detectado para análise (nenhuma variável contractsFound/global.contracts/CONTRACT_ADDRESSES)');
      return;
    }

    console.log(`[ContractRisk] iniciando análise de ${addresses.length} contrato(s)`);
    for (const addr of addresses) {
      try {
        console.log(`[ContractRisk] analisando: ${addr}`);
        const res = await contractAgent.analyzeContract(addr, etherscanKey);
        console.log('[ContractRisk] resultado:', JSON.stringify(res, null, 2));
        // se existir um objeto final de job, tente anexar os dados para que apareçam nos logs
        try {
          if (typeof jobResult !== 'undefined' && jobResult && typeof jobResult === 'object') {
            jobResult.contract_analysis = jobResult.contract_analysis || [];
            jobResult.contract_analysis.push(res);
            jobResult.contract_risk_count = (jobResult.contract_risk_count || 0) + (res.contract_score && res.contract_score > 0 ? 1 : 0);
          }
        } catch(e) { /* ignore */ }
      } catch (err) {
        console.error('[ContractRisk] erro analisando', addr, err.message);
      }
    }
  } catch (err) {
    console.error('[ContractRisk] integração falhou', err.message);
  }
})();


