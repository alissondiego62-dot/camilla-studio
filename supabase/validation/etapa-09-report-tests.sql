-- Etapa 09 — catálogo e funções de relatórios.
select to_regprocedure('public.get_operational_report(text,jsonb,integer,integer)') is not null as report_rpc,
       to_regprocedure('public.register_report_export(text,text,jsonb,integer)') is not null as export_rpc;
select module,action,allowed,scope,count(*) as profiles from public.profile_permissions where module='reports' group by module,action,allowed,scope order by action,scope;
select count(*) as export_audit_rows from public.report_export_audit;
-- Cenários obrigatórios em homologação:
-- 1. testar todos os códigos do catálogo da interface;
-- 2. relatório financeiro deve falhar sem reports.view_values e finance_professional.view_values;
-- 3. history deve falhar sem reports.view_history;
-- 4. productivity deve falhar sem reports.view_productivity;
-- 5. CSV e PDF devem registrar report_export_audit com filtros e número de linhas.
