begin;
drop function if exists public.remove_financial_entry(uuid,text);
drop index if exists public.idx_financial_entries_deleted_audit;
drop index if exists public.idx_financial_entries_professional_period;
drop index if exists public.idx_financial_entries_project_due_active;
delete from public.system_versions where version='3.0.16';
commit;
