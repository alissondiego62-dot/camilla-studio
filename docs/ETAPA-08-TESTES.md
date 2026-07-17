# Etapa 08 — Testes

## Automatizados no projeto

- estrutura das abas e ambientes;
- precisão monetária;
- separação pessoal/profissional;
- baixas parciais e ajustes;
- parcelamento e centavos;
- recorrência e idempotência;
- transferências de dupla partida;
- aprovações;
- relatórios;
- integração com Dashboard, Projetos e Relatórios;
- SQL consolidado idêntico à migration;
- ausência de dados fictícios.

## SQL

- `etapa-08-preflight.sql`;
- `etapa-08-postflight.sql`;
- `etapa-08-data-integrity.sql`;
- `etapa-08-separation-tests.sql`;
- `etapa-08-payment-tests.sql`;
- `etapa-08-recurrence-tests.sql`;
- `etapa-08-report-tests.sql`;
- `etapa-08-rls-tests.sql`.

Testes que inserem registros usam transação e `ROLLBACK`. Cenários com usuários reais devem ser executados em homologação.
