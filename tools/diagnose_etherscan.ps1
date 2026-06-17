param(
  [Parameter(Mandatory=$true)] [string]$Address,
  [string]$ApiKey = $env:ETHERSCAN_KEY,
  [string]$Endpoint = 'https://api.etherscan.io/api'
)

if (-not $ApiKey) {
  Write-Host "ERRO: API key não fornecida. Passe -ApiKey ou configure ETHERSCAN_KEY." -ForegroundColor Red
  exit 2
}

$params = [ordered]@{
  module = 'contract'
  action = 'getabi'
  address = $Address
  apikey = $ApiKey
}

# Construir URL completa para log
$query = $params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Uri]::EscapeDataString($_.Value))" } -join '&'
$fullUrl = "$Endpoint?$query"

Write-Host "-> Testando Etherscan getabi"
Write-Host "URL: $Endpoint"
Write-Host "Full URL: $fullUrl"
Write-Host "Params:"
$params.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): $($_.Value)" }

try {
  $response = Invoke-RestMethod -Uri $Endpoint -Method Get -Body $null -Headers @{} -ErrorAction Stop -TimeoutSec 30 -BodyAsJson:$false -UseBasicParsing -Query $params
  # Se Invoke-RestMethod não suporta -Query em algumas versões, fallback:
} catch {
  try {
    $uri = "$Endpoint?$query"
    $raw = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop -TimeoutSec 30
    $text = $raw.Content
    Write-Host "Resposta bruta (webrequest):"
    Write-Host $text
    $json = $null
    try { $json = $text | ConvertFrom-Json -ErrorAction Stop } catch {}
    if ($json) { Write-Host "Resposta JSON:
"; $json | ConvertTo-Json -Depth 5 }
    exit 0
  } catch {
    Write-Host "ERRO na requisição: $($_.Exception.Message)" -ForegroundColor Red
    exit 3
  }
}

Write-Host "Resposta bruta (Invoke-RestMethod):"
$response | ConvertTo-Json -Depth 5 | Write-Host

# Mostrar fields relevantes
if ($response -and $response.status) {
  Write-Host "status: $($response.status)"
  Write-Host "message: $($response.message)"
}
if ($response -and $response.result) {
  Write-Host "result (type): $($response.result.GetType().Name)"
  if ($response.result -is [string]) {
    Write-Host "result string (primeiros 500 chars):"
    Write-Host ($response.result.Substring(0, [Math]::Min(500, $response.result.Length)))
  } else {
    Write-Host "result:
"; $response.result | ConvertTo-Json -Depth 5
  }
}

# Se houver erro dentro do resultado
if ($response -and $response.result -and ($response.result -is [string]) -and ($response.result -match 'Bad jump destination' -or $response.result -match 'execution reverted')) {
  Write-Host "ALERTA: resposta indica erro de execução do contrato: $($response.result)" -ForegroundColor Yellow
}

Write-Host "Diagnóstico concluído." -ForegroundColor Cyan
exit 0
