param(
  [string]$Symbol = 'BTC'
)

if(-not (Get-Command node -ErrorAction SilentlyContinue)){
  Write-Error 'Node.js não encontrado no PATH. Instale Node.js (>=16) para executar os testes.'
  exit 1
}

$logDir = Join-Path $PSScriptRoot 'server' | Join-Path -ChildPath 'logs'
if(-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "test_agents_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

Write-Host "Executando teste de agentes para symbol=$Symbol. Log: $logFile"

$start = Get-Date
node .\test_agents.js $Symbol *> $logFile 2>&1
$end = Get-Date

Write-Host "Teste finalizado. Duração:" ($end - $start)
Write-Host "Verifique o log em: $logFile"
