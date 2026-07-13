begin;

create table if not exists public.project_financial_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  description text not null,
  category text not null default 'payment' check (category in ('entry','installment','payment','adjustment')),
  amount numeric(14,2) not null check (amount > 0),
  received_on date not null default current_date,
  payment_method text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists project_financial_entries_project_date_idx
  on public.project_financial_entries(project_id, received_on desc);

create index if not exists calendar_events_project_start_idx
  on public.calendar_events(project_id, starts_at);

alter table public.project_financial_entries enable row level security;

drop policy if exists "authenticated financial entries access" on public.project_financial_entries;
create policy "authenticated financial entries access"
  on public.project_financial_entries for all to authenticated
  using (true) with check (true);

drop policy if exists "authenticated history insert" on public.project_history;
create policy "authenticated history insert"
  on public.project_history for insert to authenticated
  with check (true);

commit;
