param(
  [string]$Symbol = 'BTC'
)

if(-not (Get-Command node -ErrorAction SilentlyContinue)){
  Write-Error 'Node.js não encontrado no PATH. Instale Node.js para executar os testes.'
  exit 1
}

Write-Host "Executando testes dos agentes para symbol = $Symbol"
node .\test_agents.js $Symbol
