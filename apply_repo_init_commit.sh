#!/usr/bin/env bash
set -e

# Script para adicionar uma entrada automática no CHANGELOG.md e commitar
# Uso: ./apply_repo_init_commit.sh

if [ ! -d .git ]; then
  echo "Erro: repositório git não inicializado. Rode ./init_repo.sh primeiro."
  exit 1
fi

CHANGELOG=CHANGELOG.md
DATE=$(date -u +"%Y-%m-%d")
ENTRY="- ${DATE}: Repo initialized (automated entry)."

# Garantir CHANGELOG.md existe
if [ ! -f "${CHANGELOG}" ]; then
  echo "# CHANGELOG" > "${CHANGELOG}"
  echo "" >> "${CHANGELOG}"
fi

# Evitar duplicatas
if grep -F "${ENTRY}" "${CHANGELOG}" >/dev/null 2>&1; then
  echo "Entrada já presente no CHANGELOG. Nada a fazer."
  exit 0
fi

# Inserir entrada no topo (após título) para manter histórico recente no começo
TMP=$(mktemp)
{
  head -n 1 "${CHANGELOG}"
  echo ""
  echo "## ${DATE}"
  echo "${ENTRY}"
  echo ""
  tail -n +2 "${CHANGELOG}"
} > "$TMP"

mv "$TMP" "${CHANGELOG}"

# Commitar mudança
git add "${CHANGELOG}"
if git commit -m "chore: repo initialized (automated changelog entry)"; then
  echo "CHANGELOG.md commitado com sucesso."
else
  echo "Nenhuma mudança para commitar ou erro ao commitar."
fi

echo "Pronto." 
