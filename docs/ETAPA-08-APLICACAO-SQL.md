# Etapa 08 — Aplicação do SQL

## Ordem

1. Backup do banco e do Storage.
2. `supabase/validation/etapa-08-preflight.sql`.
3. `camilla-studio-etapa-08.sql` — execute uma única vez.
4. `supabase/validation/etapa-08-postflight.sql`.
5. `supabase/validation/etapa-08-data-integrity.sql`.
6. Em homologação: separação, baixa, recorrência, relatórios e RLS.
7. Deploy do projeto atualizado.

Não execute o SQL consolidado e a migration equivalente em sequência: os dois arquivos possuem o mesmo conteúdo.

## Pré-requisitos

- projeto Supabase correto do Camilla Studio;
- Etapa 07 aplicada;
- `public.system_versions` contendo `3.0.8`;
- backup validado.

## Resultado esperado

A versão `3.0.9` deve aparecer em `system_versions`, as tabelas financeiras devem existir e as verificações de integridade devem retornar zero falhas.
