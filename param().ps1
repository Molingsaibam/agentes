param()

if (-not (Test-Path -Path .git)) {
  Write-Error "Erro: repositório git não inicializado. Rode init_repo.sh primeiro."
  exit 1
}

$changelog = "CHANGELOG.md"
$date = (Get-Date).ToString('yyyy-MM-dd')
$entry = "- $date: Repo initialized (automated entry)."

if (-not (Test-Path $changelog)) {
  "# CHANGELOG" | Out-File $changelog -Encoding UTF8
  "" | Out-File $changelog -Append -Encoding UTF8
}

$content = Get-Content $changelog -Raw
if ($content -like "*$entry*") {
  Write-Host "Entrada já presente no CHANGELOG. Nada a fazer."
  exit 0
}

# Inserir bloco no topo
$new = "# CHANGELOG`n`n## $date`n$entry`n`n" + ($content -replace "^# CHANGELOG[\r\n]+","")
$new | Out-File $changelog -Encoding UTF8

git add $changelog
try{
  git commit -m "chore: repo initialized (automated changelog entry)"
  Write-Host "CHANGELOG.md commitado com sucesso."
}catch{
  Write-Host "Nenhuma mudança para commitar ou erro ao commitar."
}

Write-Host "Pronto."