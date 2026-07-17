-- Etapa 09 — integridade. Os contadores de erro devem retornar zero.
select count(*) as orphan_drive_operations from public.google_drive_operations o where o.related_file_id is not null and not exists(select 1 from public.project_files f where f.id=o.related_file_id);
select count(*) as orphan_drive_shares from public.google_drive_shares s where not exists(select 1 from public.project_files f where f.id=s.project_file_id);
select count(*) as duplicate_active_drive_files from(
 select drive_connection_id,drive_file_id,count(*) total from public.project_files where archived_at is null and drive_connection_id is not null and drive_file_id is not null group by drive_connection_id,drive_file_id having count(*)>1
) x;
select count(*) as active_public_shares_while_disabled from public.google_drive_shares s cross join public.google_drive_settings g where g.id=true and not g.allow_public_sharing and s.share_type='anyone' and s.revoked_at is null;
select count(*) as expired_oauth_states from integration_private.google_drive_oauth_states where expires_at<now();
select count(*) as exports_without_user from public.report_export_audit where user_id is null;
select version,notes,environment,released_at from public.system_versions where version='3.0.10';
