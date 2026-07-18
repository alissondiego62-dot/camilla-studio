begin;
-- Reversão conservadora: remove apenas RPCs da Etapa 11 e preserva catálogos, modelos e snapshots.
drop function if exists public.copy_stage_checklist_item(uuid,text);
drop function if exists public.reorder_stage_checklist_items(jsonb);
drop function if exists public.archive_stage_checklist_item(uuid);
drop function if exists public.save_stage_checklist_item(jsonb);
drop function if exists public.list_stage_checklists();
drop function if exists public.delete_workflow_catalog(text,uuid,text);
drop function if exists public.set_workflow_catalog_active(text,uuid,boolean);
drop function if exists public.reorder_workflow_catalog(text,uuid[]);
drop function if exists public.save_workflow_catalog(text,jsonb);
drop function if exists public.list_workflow_catalog(text);
drop function if exists public.workflow_catalog_usage(text,text);
drop function if exists public.workflow_catalog_table(text);
commit;
