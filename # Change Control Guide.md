# Change Control Guide

Objetivo: manter histórico de alterações e instruções claras por agente.

Como registrar mudança:

1. Faça a alteração no código.
2. Atualize o arquivo `CHANGELOG.md` na raiz com resumo curto (data e descrição).
3. Atualize o `CHANGELOG` ou `README.md` do agente específico dentro de `server/agents/<agent>/README.md` com detalhes.
4. Commit e push para controle de versão (git).

Modelo de entrada no CHANGELOG.md:

- YYYY-MM-DD: Descrição curta. Autor.

Exemplo:

- 2026-05-19: Criado agente collector (coleta de notícias). — guibi

Recomendações:

- Use commits atômicos.
- Inclua referências a issues (se houver).
- Não coloque chaves sensíveis no log.
