Set-Location $PSScriptRoot

if(-not (Get-Command docker -ErrorAction SilentlyContinue)){
  Write-Error "Docker nao encontrado. Instale/abra o Docker Desktop e rode novamente."
  exit 1
}

docker compose up --build
