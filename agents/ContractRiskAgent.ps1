function Get-ContractRiskScore {
    param(
        [Parameter(Mandatory=$true)]
        [string]$AbiJson
    )

    # Tenta converter ABI em objeto
    try {
        $abi = $AbiJson | ConvertFrom-Json -ErrorAction Stop
    } catch {
        throw "ABI inválida: $($_.Exception.Message)"
    }

    $score = 0
    $reasons = @()
    $signals = @()

    # Normalize entries
    $entries = @($abi)

    # Detect fallback/receive payable
    $fallback = $entries | Where-Object { ($_.type -eq 'fallback' -or $_.type -eq 'receive') }
    if ($fallback) {
        foreach ($f in $fallback) {
            if ($f.stateMutability -eq 'payable' -or $f.payable -eq $true) {
                $score += 30
                $reasons += 'fallback/receive payable presente'
                $signals += @{type='fallback'; details=$f}
            }
        }
    }

    # Detect functions with payable stateMutability
    $payableFuncs = $entries | Where-Object { $_.type -eq 'function' -and ($_.stateMutability -eq 'payable' -or $_.payable -eq $true) }
    if ($payableFuncs.Count -gt 0) {
        $score += [Math]::Min(20, 5 * $payableFuncs.Count)
        $reasons += "funções payable detectadas: $($payableFuncs.Count)"
        $signals += @{type='payable_functions'; count = $payableFuncs.Count}
    }

    # Keywords a procurar nas funções
    $funcs = $entries | Where-Object { $_.type -eq 'function' }
    $names = $funcs | ForEach-Object { $_.name } | Where-Object { $_ }

    $checkList = @(
        @{kw='selfdestruct'; weight=50; reason='possível chamada selfdestruct'},
        @{kw='delegatecall'; weight=40; reason='uso de delegatecall detectado'},
        @{kw='delegate_call'; weight=40; reason='uso de delegatecall detectado'},
        @{kw='upgradeTo'; weight=40; reason='função de upgrade detectada'},
        @{kw='upgrade'; weight=25; reason='possível mecanismo de upgrade'},
        @{kw='initialize'; weight=20; reason='função initialize (proxy/upgrade pattern) detectada'},
        @{kw='implementation'; weight=25; reason='referência a implementation/proxy detectada'},
        @{kw='proxi'; weight=25; reason='mecanismo proxy provável (nome contém proxi)'},
        @{kw='owner'; weight=10; reason='funções owner/admin detectadas'},
        @{kw='transferOwnership'; weight=10; reason='transferOwnership detectado'},
        @{kw='renounce'; weight=10; reason='renounceOwnership detectado'},
        @{kw='mint'; weight=15; reason='função mint detectada'},
        @{kw='burn'; weight=15; reason='função burn detectada'},
        @{kw='pause'; weight=10; reason='função pause/unpause detectada'}
    )

    foreach ($c in $checkList) {
        $foundMatches = $names | Where-Object { $_ -and ($_.ToLower().Contains($c.kw.ToLower())) }
        if ($foundMatches.Count -gt 0) {
            $count = $foundMatches.Count
            # acumulamos, mas limitamos impacto por keyword
            $add = [Math]::Min($c.weight * $count, 100 - $score)
            $score += $add
            $reasons += "$($c.reason) (found: $count)"
            $signals += @{type=$c.kw; matches=$foundMatches}
        }
    }

    # Heurística: muitas chamadas externas (muitos parâmetros do tipo address) => risco
    $externalCalls = $funcs | Where-Object { $_.inputs -and ($_.inputs | Where-Object { $_.type -match 'address' }).Count -ge 2 }
    if ($externalCalls.Count -gt 3) {
        $score += 10
        $reasons += 'múltiplas funções aceitam vários endereços (potencial risco de transferencia/controle)'
        $signals += @{type='many_address_inputs'; count=$externalCalls.Count}
    }

    # Normaliza score no intervalo 0-100
    if ($score -gt 100) { $score = 100 }
    if ($score -lt 0) { $score = 0 }

    # Nível textual
    if ($score -ge 70) { $level = 'high' }
    elseif ($score -ge 30) { $level = 'medium' }
    else { $level = 'low' }

    $result = [PSCustomObject]@{
        score = $score
        level = $level
        reasons = $reasons
        signals = $signals
        analyzed_at = (Get-Date).ToString('o')
    }

    return $result
}

# Exemplo de uso (comentado):
# $abiJson = Get-Content '.\example_abi.json' -Raw
# Get-ContractRiskScore -AbiJson $abiJson | ConvertTo-Json -Depth 5
