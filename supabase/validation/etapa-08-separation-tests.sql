-- Etapa 08 — testes estruturais de separação entre ambientes. Somente leitura.
select pg_get_functiondef('public.can_access_finance_environment(text,uuid,text)'::regprocedure) as authorization_definition;
select policyname,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename='financial_entries' order by policyname;
select count(*) as personal_rows_with_wrong_owner
from public.financial_entries where environment='personal' and owner_user_id is null;
select count(*) as personal_delegations_without_owner
from public.financial_environment_access where environment='personal' and owner_user_id is null and archived_at is null;
select count(*) as duplicate_active_access
from (select environment,coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid),user_id
      from public.financial_environment_access where archived_at is null group by 1,2,3 having count(*)>1) x;
select has_table_privilege('authenticated','public.financial_entry_balance_view','SELECT') as authenticated_direct_balance_view;
-- Resultado esperado para authenticated_direct_balance_view: false.
