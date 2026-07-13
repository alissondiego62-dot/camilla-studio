-- Camilla Studio: arquivo de projetos finalizados e financeiro completo.

alter table if exists public.project_financial_entries
  alter column project_id drop not null;

alter table if exists public.project_financial_entries
  add column if not exists entry_type text not null default 'income';

update public.project_financial_entries
set entry_type = 'income'
where entry_type is null or entry_type not in ('income', 'expense');

alter table if exists public.project_financial_entries
  drop constraint if exists project_financial_entries_entry_type_check;

alter table if exists public.project_financial_entries
  add constraint project_financial_entries_entry_type_check
  check (entry_type in ('income', 'expense'));

create index if not exists project_financial_entries_entry_type_idx
  on public.project_financial_entries (entry_type, received_on desc);

create index if not exists projects_completed_client_idx
  on public.projects (client_id, updated_at desc)
  where stage = 'completed' or status = 'completed';

comment on column public.project_financial_entries.project_id is
  'Projeto opcional. Nulo para receitas ou despesas avulsas.';
comment on column public.project_financial_entries.entry_type is
  'Tipo do lançamento: income (receita) ou expense (despesa).';
