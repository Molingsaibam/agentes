# Git Instructions

## Inicializar repositório local

1. Torne o script executável (Unix):

   chmod +x init_repo.sh

2. Execute:

   ./init_repo.sh

Isso inicializa um repositório Git local e cria o commit inicial com toda a estrutura do projeto.

## Inserir entrada automática no CHANGELOG e commitar

Após inicializar o repo, você pode registrar automaticamente a inicialização no CHANGELOG e criar um commit:

- Unix:

  chmod +x apply_repo_init_commit.sh
  ./apply_repo_init_commit.sh

- PowerShell:

  .\apply_repo_init_commit.ps1

O script evita duplicatas e só adiciona a entrada se ela não existir.

## Publicar no GitHub (push)

- Unix (script):

  ./push_to_github.sh git@github.com:seuuser/seurepo.git main

- PowerShell:

  .\push_to_github.ps1 -RemoteUrl git@github.com:seuuser/seurepo.git -Branch main

Notas:

- Os scripts assumem que você já tenha SSH configurado (chave pública no GitHub) ou use uma URL HTTPS.
- Se usar HTTPS, o script pedirá suas credenciais (ou utilize um token).
- Caso precise, ajuste a branch (padrão: main).

## Dicas rápidas

- Para configurar seu usuário Git (se necessário):

  git config --global user.name "Seu Nome"
  git config --global user.email "seu@email"

- Verifique o status antes de push: git status

- Para desfazer last commit local: git reset --soft HEAD~1
