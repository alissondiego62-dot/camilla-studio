begin;

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  category text not null default 'other' check (category in (
    'drive_folder','contract','briefing','survey','drawing','executive',
    'render','photo','rrt','memorial','other'
  )),
  drive_url text not null check (drive_url ~ '^https://(drive|docs)\\.google\\.com/'),
  drive_file_id text,
  mime_type text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_files_project_idx on public.project_files(project_id);
create index if not exists project_files_category_idx on public.project_files(project_id, category);
create unique index if not exists project_files_project_url_unique on public.project_files(project_id, drive_url);

drop trigger if exists project_files_set_updated_at on public.project_files;
create trigger project_files_set_updated_at
before update on public.project_files
for each row execute function public.set_updated_at();

alter table public.project_files enable row level security;

drop policy if exists "authenticated project files access" on public.project_files;
create policy "authenticated project files access"
on public.project_files for all to authenticated
using (true) with check (true);

create or replace function public.log_project_file_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.project_id, 'drive_link_added', 'Link do Google Drive adicionado: ' || new.name || '.', auth.uid());
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (old.project_id, 'drive_link_removed', 'Link do Google Drive removido: ' || old.name || '.', auth.uid());
    return old;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists project_files_history on public.project_files;
create trigger project_files_history
after insert or delete on public.project_files
for each row execute function public.log_project_file_change();

commit;
