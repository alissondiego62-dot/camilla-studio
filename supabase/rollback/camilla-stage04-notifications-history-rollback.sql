-- Etapa 04 — rollback conservador. Preserva dados, comentários, arquivos, notificações e histórico.
begin;
set local lock_timeout='20s';

drop trigger if exists project_history_sync_central on public.project_history;
drop trigger if exists clients_history_central on public.clients;
drop trigger if exists project_activities_history_notify on public.project_activities;
drop trigger if exists calendar_events_history_notify on public.calendar_events;
drop trigger if exists calendar_events_set_updated_by on public.calendar_events;
drop trigger if exists financial_entries_history_notify on public.financial_entries;
drop trigger if exists profiles_history_central on public.profiles;
drop trigger if exists profile_permissions_history_central on public.profile_permissions;
drop trigger if exists user_permission_overrides_history_central on public.user_permission_overrides;
drop trigger if exists system_settings_history_central on public.system_settings;
drop trigger if exists project_comments_history_notify on public.project_comments;
drop trigger if exists comment_mentions_notify on public.comment_mentions;
drop trigger if exists project_files_history_notify on public.project_files;

do $$ begin
  if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then alter publication supabase_realtime drop table public.notifications; end if;
end $$;

-- Restaura políticas seguras compatíveis com a Etapa 03.
do $$ declare r record;begin
 for r in select policyname from pg_policies where schemaname='public' and tablename='project_comments' loop execute format('drop policy if exists %I on public.project_comments',r.policyname);end loop;
 for r in select policyname from pg_policies where schemaname='public' and tablename='project_files' loop execute format('drop policy if exists %I on public.project_files',r.policyname);end loop;
end $$;
create policy project_comments_select_scope on public.project_comments for select to authenticated using(public.can_access_project(project_id));
create policy project_comments_insert_scope on public.project_comments for insert to authenticated with check(public.can_access_project(project_id) and coalesce(author_id,auth.uid())=auth.uid());
create policy project_comments_update_scope on public.project_comments for update to authenticated using(author_id=auth.uid() and public.can_access_project(project_id)) with check(author_id=auth.uid() and public.can_access_project(project_id));
create policy project_comments_delete_scope on public.project_comments for delete to authenticated using(author_id=auth.uid() or public.can_edit_project(project_id));
create policy project_files_select_scope on public.project_files for select to authenticated using(project_id is not null and public.can_access_project(project_id) and public.has_permission('files','view','assigned'));
create policy project_files_insert_scope on public.project_files for insert to authenticated with check(project_id is not null and public.can_edit_project(project_id) and public.has_permission('files','add_file','assigned'));
create policy project_files_update_scope on public.project_files for update to authenticated using(project_id is not null and public.can_edit_project(project_id) and public.has_permission('files','add_file','assigned')) with check(project_id is not null and public.can_edit_project(project_id));
create policy project_files_delete_scope on public.project_files for delete to authenticated using(project_id is not null and public.can_edit_project(project_id) and public.has_permission('files','remove_file','assigned'));

-- Mantém as tabelas da Etapa 04 e seus dados, mas bloqueia novas gravações de usuários comuns.
revoke insert,update,delete on public.notifications,public.history_entries,public.record_views,public.comment_mentions,public.comment_reads,public.notification_user_rules from authenticated;
update public.system_versions set notes=notes||' [Etapa 04 desativada por rollback conservador]' where version='3.0.5';
commit;
