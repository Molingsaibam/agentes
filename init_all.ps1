param(
  [string]$RemoteUrl = "",
  [string]$Branch = 'main',
  [switch]$Push
)

Set-Location $PSScriptRoot

if (-not (Test-Path -Path ".git")) {
  Write-Host "Inicializando repositório git..."
  try{
    git init
    git add .
    git commit -m "chore: initial project structure" 2>$null
    Write-Host "Repositório inicializado e commit criado."
  }catch{
    Write-Warning "Falha ao inicializar/commitar via git: $_"
  }
} else {
  Write-Host "Repositório já inicializado."
}

# Aplicar entrada automática no CHANGELOG
if(Test-Path "./apply_repo_init_commit.ps1"){
  Write-Host "Executando apply_repo_init_commit.ps1..."
  try{
    & .\apply_repo_init_commit.ps1
  }catch{
    Write-Warning "apply_repo_init_commit.ps1 falhou: $_"
  }
} else {
  Write-Host "apply_repo_init_commit.ps1 não encontrado, pulando."
}

# Executar cleanup (movimenta arquivos inválidos/duplicados para trash e commita)
if(Test-Path "./cleanup_and_commit.ps1"){
  Write-Host "Executando cleanup_and_commit.ps1..."
  try{
    & .\cleanup_and_commit.ps1
  }catch{
    Write-Warning "cleanup_and_commit.ps1 falhou: $_"
  }
} else {
  Write-Host "cleanup_and_commit.ps1 não encontrado, pulando."
}

# Opcional: adicionar remote e push
if($Push.IsPresent -and ($RemoteUrl -ne "")){
  if (-not (Test-Path -Path ".git")){
    Write-Error "Repositório git não inicializado. Não é possível fazer push."
  }else{
    try{
      git remote remove origin 2>$null
    }catch{}
    try{
      git remote add origin $RemoteUrl
      git branch -M $Branch
      git push -u origin $Branch
      Write-Host "Push concluído para $RemoteUrl (branch $Branch)."
    }catch{
      Write-Warning "Falha ao fazer push: $_"
    }
  }
}

Write-Host "init_all concluído."
