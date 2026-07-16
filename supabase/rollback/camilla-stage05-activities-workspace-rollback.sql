-- Camilla Studio Etapa 05 — rollback conservador
-- Este rollback desativa automações da Etapa 05 sem apagar atividades,
-- participantes, visualizações salvas, comentários, anexos ou histórico.
begin;

set local lock_timeout='10s';
set local statement_timeout='120s';

drop trigger if exists project_activities_validate_hierarchy on public.project_activities;
drop trigger if exists project_activities_sync_fields on public.project_activities;
drop trigger if exists project_activities_enforce_children on public.project_activities;
drop trigger if exists project_activities_recalculate_parent on public.project_activities;

-- Mantemos ON DELETE SET NULL por ser mais seguro do que restaurar CASCADE.
update public.activity_statuses set name='Em espera',updated_at=now() where code='waiting';
update public.activity_statuses set active=false,archived_at=coalesce(archived_at,now()),updated_at=now() where code='blocked';

insert into public.system_settings(key,value,description)
values('activity_auto_complete_parent','false'::jsonb,'Conclusão automática da atividade principal desativada pelo rollback da Etapa 05.')
on conflict(key) do update set value=excluded.value,description=excluded.description,updated_at=now();

insert into public.system_versions(version,notes,environment)
values('3.0.6-rollback','Rollback conservador da Etapa 05. Dados aditivos foram preservados.','production')
on conflict(version) do update set notes=excluded.notes,released_at=now();

commit;
