param(
  [switch]$DryRun
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

if (-not (Test-Path -Path ".git")) {
  Write-Error "Erro: repositório git não inicializado. Rode init_repo.sh primeiro."
  exit 1
}

$trash = Join-Path $root 'trash'
if(-not (Test-Path $trash)) { New-Item -ItemType Directory -Path $trash | Out-Null }

# Encontrar arquivos com nomes potencialmente problemáticos (caracteres estranhos, #, espaços, colchetes, parênteses)
$candidates = Get-ChildItem -Recurse -File |
  Where-Object {
    ($_.FullName -notmatch '\\.git\\') -and
    ($_.FullName -notmatch '\\cleanup\\') -and
    ($_.Name -match '[\{\}\[\]\(\)\#]' -or $_.Name -match '^#' -or $_.Name -match '\s')
  }

if(-not $candidates -or $candidates.Count -eq 0) {
  Write-Host "Nenhum arquivo duplicado ou com nome inválido encontrado."
} else {
  foreach($f in $candidates) {
    $rel = $f.FullName.Substring($root.Length).TrimStart('\')
    $dest = Join-Path $trash $rel
    $destDir = Split-Path $dest -Parent
    if(-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Write-Host "Movendo: $rel -> " (Join-Path 'trash' $rel)
    Move-Item -Force -LiteralPath $f.FullName -Destination $dest
  }
}

if($DryRun) {
  Write-Host "DryRun: não fará git commit."
  exit 0
}

# Stage e commit
try{
  git add -A
  $commitMsg = "chore: cleanup duplicate/invalid filenames -> trash; add cleanup files"
  if (git commit -m $commitMsg) {
    Write-Host "Commit criado: $commitMsg"
  } else {
    Write-Host "Nenhuma mudança para commitar ou erro ao commitar."
  }
}catch{
  Write-Error "Erro ao executar git commit: $_"
}

Write-Host "Pronto."