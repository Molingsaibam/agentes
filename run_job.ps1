param(
  [string]$Symbol = 'BTC',
  [int]$PollInterval = 2,
  [int]$Timeout = 120,
  [string]$GithubToken = '',
  [string]$EtherscanKey = '',
  [int]$Port = 3000
)

$base = "http://localhost:$Port"

# Injetar tokens temporários na sessão (não persiste em arquivos)
if($GithubToken -ne ''){
  $env:GITHUB_TOKEN = $GithubToken
  Write-Host 'GITHUB_TOKEN definido nesta sessão (temporário)'
}
if($EtherscanKey -ne ''){
  $env:ETHERSCAN_KEY = $EtherscanKey
  Write-Host 'ETHERSCAN_KEY definido nesta sessão (temporário)'
}

# Forçar porta na sessão (temporário)
$env:PORT = $Port
Write-Host "PORT definido nesta sessão (temporário): $Port"

# Verificar health do servidor; se não estiver rodando, iniciar (herda env)
$serverRunning = $false
try{
  $h = Invoke-RestMethod -Uri "$base/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
  $serverRunning = $true
}catch{
  $serverRunning = $false
}

if(-not $serverRunning){
  Write-Host 'Servidor não detectado em http://localhost:3000 — iniciando servidor (pode demorar)...'
  try{
    $nodePath = 'node'
    Start-Process -FilePath $nodePath -ArgumentList 'server/server.js' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden | Out-Null
    # aguardar até health responder
    $waitDeadline = (Get-Date).AddSeconds(30)
    while((Get-Date) -lt $waitDeadline){
      try{
        $h = Invoke-RestMethod -Uri "$base/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host 'Servidor pronto.'
        break
      }catch{ Start-Sleep -Seconds 1 }
    }
  }catch{
    Write-Warning 'Falha ao iniciar servidor automaticamente. Inicie manualmente para que tokens tenham efeito.'
  }
} else {
  if($GithubToken -ne '' -or $EtherscanKey -ne ''){
    Write-Warning 'Servidor já em execução — reinicie o servidor para que os tokens aplicados nesta sessão sejam usados pelo processo do servidor.'
  }
}

if(-not (Get-Command Invoke-RestMethod -ErrorAction SilentlyContinue)){
  Write-Error 'Invoke-RestMethod não disponível.'
  exit 1
}

try{
  Write-Host "Enviando job para símbolo: $Symbol"
  $body = @{ symbol = $Symbol } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$base/jobs" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 10
}catch{
  Write-Error "Falha ao criar job: $_"
  exit 1
}

$id = $resp.id
if(-not $id){ Write-Error 'Resposta inválida, id não encontrado'; exit 1 }

Write-Host "Job criado: $id - aguardando conclusão..."

$endTime = (Get-Date).AddSeconds($Timeout)
$logDir = Join-Path $PSScriptRoot 'server' | Join-Path -ChildPath 'logs'
if(-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$outFile = Join-Path $logDir ("job-$id.json")

while((Get-Date) -lt $endTime){
  try{
    $job = Invoke-RestMethod -Uri "$base/jobs/$id" -Method Get -TimeoutSec 10
  }catch{
    Write-Warning "Erro ao consultar job: $_. Tentando novamente..."
    Start-Sleep -Seconds $PollInterval
    continue
  }

  Write-Host "Status: $($job.status)"

  if($job.status -eq 'finished' -or $job.status -eq 'error'){
    $job | ConvertTo-Json -Depth 20 | Out-File -FilePath $outFile -Encoding utf8
    Write-Host "Job finalizado com status: $($job.status). Resultado salvo em: $outFile"
    if($job.status -eq 'error'){ exit 2 } else { exit 0 }
  }

  Start-Sleep -Seconds $PollInterval
}

Write-Error "Timeout aguardando conclusão do job (>$Timeout segundos). Verifique servidor e logs."
exit 1
