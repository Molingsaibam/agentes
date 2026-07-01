import 'dotenv/config'
import backtest from './server/agents/backtest/index.js'

// Garantir carregar .env da pasta server quando existir
import fs from 'fs'
import path from 'path'
const serverEnv = path.join(process.cwd(), 'server', '.env')
if(fs.existsSync(serverEnv)){
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  import('dotenv').then(d => d.config({ path: serverEnv }))
}

async function main(){
  const arg = process.argv[2]
  let tracked = undefined
  if(arg){
    try{ tracked = JSON.parse(arg) }catch(e){ tracked = undefined }
  }

  console.log('Executando backtests...')
  try{
    const res = await backtest.runBacktests(tracked)
    console.log(JSON.stringify(res, null, 2))
  }catch(e){
    console.error('Erro ao rodar backtests:', e && e.message)
    process.exitCode = 1
  }
}

main()
