begin;
drop function if exists public.create_project_with_contract(jsonb);
delete from public.system_versions where version='3.0.19';
commit;
