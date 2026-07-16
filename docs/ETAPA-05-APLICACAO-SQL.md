# Etapa 05 — Aplicação do SQL

## Pré-requisitos

- Etapas 02, 03 e 04 aplicadas;
- versão `3.0.5` presente em `system_versions`;
- backup recente do banco.

## Ordem

1. `supabase/validation/etapa-05-preflight.sql`;
2. `camilla-studio-etapa-05.sql`;
3. `supabase/validation/etapa-05-postflight.sql`;
4. `supabase/validation/etapa-05-data-integrity.sql`;
5. testes de hierarquia e visualizações salvas em homologação;
6. testes RLS com usuários de perfis diferentes.

O SQL é transacional. Não execute também a migration equivalente após executar o consolidado.

## Confirmação rápida

```sql
select
  to_regclass('public.activity_participants'),
  to_regclass('public.activity_saved_views'),
  exists(select 1 from public.system_versions where version='3.0.6');
```
