# Libera a porta 3000 matando o processo que está usando
try {
  $conns = Get-NetTCPConnection -LocalPort 3000 -ErrorAction Stop
  foreach ($conn in $conns) {
    $pid = $conn.OwningProcess
    if ($pid -and $pid -ne $PID) {
      Write-Host "Matando processo $pid que usava a porta 3000..."
      Stop-Process -Id $pid -Force
    }
  }
  Write-Host "Porta 3000 liberada."
} catch {
  Write-Host "Nenhum processo usando a porta 3000 encontrado."
}
