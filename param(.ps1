param(
  [Parameter(Mandatory=$true)] [string]$RemoteUrl,
  [string]$Branch = 'main'
)

if (-not (Test-Path -Path .git)) {
  Write-Error "Repositório git não inicializado. Rode init_repo.sh primeiro."
  exit 1
}

try{
  git remote remove origin -ErrorAction SilentlyContinue
}catch{}

git remote add origin $RemoteUrl

git branch -M $Branch

git push -u origin $Branch
Write-Host "Push concluído para $RemoteUrl (branch $Branch)."
