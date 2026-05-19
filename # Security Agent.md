# Security Agent

Propósito: validação básica de inputs / proteções iniciais.

Como usar:

- Exporta `validateSecurity(symbol)` que lança erro se encontrar termos maliciosos.

Notas:

- Método simples para evitar injeção via symbol; não substitui validações no restante da stack.

CHANGELOG

- 2026-05-19: Implementação inicial.
