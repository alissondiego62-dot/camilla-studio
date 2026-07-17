-- Etapa 09 — cenários obrigatórios do Dashboard em homologação.
select routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name in('get_dashboard_workspace','get_dashboard_summary');
select module,action,allowed,scope,count(*) as profiles from public.profile_permissions where module='dashboard' group by module,action,allowed,scope order by action,scope;
-- Executar com usuários reais:
-- 1. colaborador recebe somente projetos, atividades, agenda e clientes acessíveis;
-- 2. usuário sem dashboard.view_financial recebe financial.visible=false e nenhum valor;
-- 3. usuário com view_financial, mas sem finance_professional.view_values, não recebe valores;
-- 4. proprietária autorizada recebe os indicadores profissionais;
-- 5. filtros por responsável, projeto e cliente não ampliam o escopo do usuário.
