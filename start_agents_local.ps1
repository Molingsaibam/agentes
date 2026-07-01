Set-Location $PSScriptRoot

$agents = @(
  @{ Name = 'security'; Port = 3101 },
  @{ Name = 'collector'; Port = 3102 },
  @{ Name = 'spam'; Port = 3105 },
  @{ Name = 'filter'; Port = 3103 },
  @{ Name = 'risk'; Port = 3106 },
  @{ Name = 'sentiment'; Port = 3104 },
  @{ Name = 'translator'; Port = 3107 },
  @{ Name = 'community'; Port = 3108 },
  @{ Name = 'git'; Port = 3109 },
  @{ Name = 'intelligence'; Port = 3110 },
  @{ Name = 'market'; Port = 3111 },
  @{ Name = 'backtest'; Port = 3112 }
)

foreach($agent in $agents){
  $existing = Get-NetTCPConnection -LocalPort $agent.Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

  if($existing){
    Write-Host "$($agent.Name) ja esta online na porta $($agent.Port)."
    continue
  }

  Start-Process -FilePath node -ArgumentList "server/agents/runtime.js $($agent.Name)" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  Write-Host "Iniciando $($agent.Name) na porta $($agent.Port)."
}

$env:PORT = '3000'
$env:SECURITY_AGENT_URL = 'http://localhost:3101'
$env:COLLECTOR_AGENT_URL = 'http://localhost:3102'
$env:SPAM_AGENT_URL = 'http://localhost:3105'
$env:FILTER_AGENT_URL = 'http://localhost:3103'
$env:RISK_AGENT_URL = 'http://localhost:3106'
$env:SENTIMENT_AGENT_URL = 'http://localhost:3104'
$env:TRANSLATOR_AGENT_URL = 'http://localhost:3107'
$env:COMMUNITY_AGENT_URL = 'http://localhost:3108'
$env:GIT_AGENT_URL = 'http://localhost:3109'
$env:INTELLIGENCE_AGENT_URL = 'http://localhost:3110'
$env:MARKET_AGENT_URL = 'http://localhost:3111'
$env:BACKTEST_AGENT_URL = 'http://localhost:3112'

Write-Host "Iniciando API em http://localhost:3000"
node server/server.js
