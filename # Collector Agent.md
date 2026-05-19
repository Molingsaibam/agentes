# Collector Agent

Propósito: coletar notícias e dados básicos sobre uma moeda/ativo.

Como usar:

- Exporta a função `collectCoinData(symbol)` que retorna um objeto com `symbol`, `collected_at` e `news`.
- Atualmente busca notícias na API pública CryptoCompare.

Notas de organização:

- Mantenha este arquivo focado apenas em coleta de dados.
- Não incluir chaves sensíveis aqui; use variáveis de ambiente no servidor se necessário.

CHANGELOG

- 2026-05-19: Criado agente collector inicial com CryptoCompare e limitação a 15 notícias.
