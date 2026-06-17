# Run tests for ContractRiskAgent
$agentPath = Join-Path $PSScriptRoot '..\agents\ContractRiskAgent.ps1'
. $agentPath

function AssertEqual($a,$b,$msg) {
    if ($a -ne $b) {
        Write-Host "FAIL: $msg ($a != $b)" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "OK: $msg" -ForegroundColor Green
    }
}

Write-Host "Running ContractRiskAgent tests..."

# Test 1: Low-risk ABI
$lowAbi = '[
  {"type":"function","name":"balanceOf","inputs":[{"name":"owner","type":"address"}],"stateMutability":"view"},
  {"type":"function","name":"totalSupply","stateMutability":"view"}
]'

$resLow = Get-ContractRiskScore -AbiJson $lowAbi
Write-Host "Low test result: score=$($resLow.score) level=$($resLow.level)"
AssertEqual $resLow.level 'low' 'Low-risk ABI should be low'

# Test 2: High-risk ABI
$highAbi = '[
  {"type":"fallback","stateMutability":"payable"},
  {"type":"function","name":"selfdestructNow","stateMutability":"nonpayable"},
  {"type":"function","name":"delegatecallTo","stateMutability":"nonpayable"},
  {"type":"function","name":"mint","stateMutability":"nonpayable"},
  {"type":"function","name":"transferOwnership","stateMutability":"nonpayable"}
]'

$resHigh = Get-ContractRiskScore -AbiJson $highAbi
Write-Host "High test result: score=$($resHigh.score) level=$($resHigh.level)"
if ($resHigh.score -lt 50) {
    Write-Host "FAIL: High-risk ABI score too low ($($resHigh.score))" -ForegroundColor Red
    exit 1
} else {
    Write-Host "OK: High-risk ABI score >=50" -ForegroundColor Green
}

Write-Host "All tests passed." -ForegroundColor Cyan
exit 0
