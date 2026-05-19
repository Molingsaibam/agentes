# Market Agents — Fase 1

Estrutura mínima de agentes, backend e frontend para coleta, filtro e análise de sentimento.

Como rodar:

1. npm install (na raiz do projeto que contém package.json)
2. configurar server/.env com PORT e CMC_KEY
3. node server/server.js
4. abrir frontend/index.html no navegador

Arquitetura:

- backend em server/
- agentes em server/agents
- frontend em frontend/

OBS: Não inclua chaves sensíveis no frontend.

## Organização e Git

Scripts úteis incluidos na raiz:

- init_repo.sh — inicializa repositório Git local e cria commit inicial.
- apply_repo_init_commit.sh — insere entrada automática no CHANGELOG.md e cria commit.
- push_to_github.sh — adiciona remote e faz push (Unix).
- push_to_github.ps1 — adiciona remote e faz push (PowerShell).

Siga GIT_INSTRUCTIONS.md para passos detalhados.
