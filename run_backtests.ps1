param(
  [string]$TrackedJson = '',
  [switch]$UseSample,
  [string]$CryptoCompareKey = '',
  [string]$GithubToken = ''
)

if(-not (Get-Command node -ErrorAction SilentlyContinue)){
  Write-Error 'Node.js não encontrado no PATH. Instale Node.js (>=16) para executar os backtests.'
  exit 1
}

$logDir = Join-Path $PSScriptRoot 'server' | Join-Path -ChildPath 'logs'
if(-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "backtests_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

Write-Host "Executando backtests. Log: $logFile"

# Preparar ambiente para o processo filho
$envVars = @{ }
if($UseSample.IsPresent){ $envVars['COLLECTOR_USE_SAMPLE'] = '1' }
if($CryptoCompareKey -ne ''){ $envVars['CRYPTOCOMPARE_KEY'] = $CryptoCompareKey }
if($GithubToken -ne ''){ $envVars['GITHUB_TOKEN'] = $GithubToken }

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'node'
$psi.Arguments = if($TrackedJson -ne '') { ".\test_backtests.js '$TrackedJson'" } else { '.\test_backtests.js' }
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.WorkingDirectory = $PSScriptRoot

# Passar variáveis de ambiente
foreach($k in $envVars.Keys){ $psi.Environment[$k] = $envVars[$k] }

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$proc.Start() | Out-Null

$out = $proc.StandardOutput.ReadToEnd()
$err = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()

# Escrever saída completa no log
$out + "`n" + $err | Out-File -FilePath $logFile -Encoding utf8

Write-Host "Teste finalizado. Verifique o log em: $logFile"
