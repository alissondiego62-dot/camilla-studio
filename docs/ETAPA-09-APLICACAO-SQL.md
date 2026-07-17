# Etapa 09 — Aplicação do SQL

## Banco já atualizado até 3.0.9
1. Faça backup do banco e do Storage.
2. Execute `supabase/validation/etapa-09-preflight.sql`.
3. Execute somente `camilla-studio-etapa-09.sql`.
4. Execute `etapa-09-postflight.sql`.
5. Execute `etapa-09-data-integrity.sql`.
6. Execute os testes de Dashboard, relatórios, Drive e RLS em homologação.
7. Configure e publique as Edge Functions.
8. Publique a aplicação.

Não execute o SQL consolidado e a migration equivalente em sequência.

## Instalação nova a partir do projeto
A migration da Etapa 08 no ZIP já contém o hotfix que remove temporariamente as views dependentes antes de alterar a precisão monetária. Execute as migrations em ordem cronológica. Não aplique também os SQLs consolidados.

## Validação rápida
```sql
select
  exists(select 1 from public.system_versions where version='3.0.10') as version_3010,
  to_regclass('public.report_export_audit') as report_export_audit,
  to_regclass('public.google_drive_operations') as drive_operations,
  to_regclass('public.google_drive_shares') as drive_shares,
  to_regprocedure('public.get_dashboard_workspace(jsonb)') is not null as dashboard_rpc,
  to_regprocedure('public.get_operational_report(text,jsonb,integer,integer)') is not null as reports_rpc;
```

O SQL da Etapa 09 não foi aplicado remotamente durante a geração do pacote.
