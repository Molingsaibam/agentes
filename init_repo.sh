#!/usr/bin/env bash
set -e

echo "Inicializando repositório git..."
if [ -d .git ]; then
  echo "Já existe um repositório git nesta pasta"
  exit 0
fi

git init
git add .
git commit -m "chore: initial project structure"

echo "Repositório inicializado e commit criado."

echo "Dicas: configure seu user.name e user.email se necessário:"
 echo "  git config --global user.name \"Seu Nome\""
 echo "  git config --global user.email \"seu@email\""

echo "Pronto."
