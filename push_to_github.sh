#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Uso: ./push_to_github.sh <git_remote_url> [branch]"
  exit 1
fi

REMOTE=$1
BRANCH=${2:-main}

if [ ! -d .git ]; then
  echo "Repositório git não inicializado. Rode ./init_repo.sh primeiro."
  exit 1
fi

# Remove origem antiga se existir
git remote remove origin 2>/dev/null || true

git remote add origin "$REMOTE"

git branch -M "$BRANCH"

git push -u origin "$BRANCH"

echo "Push concluído para $REMOTE (branch $BRANCH)."
