-- Etapa 06 — confirmação estrutural
select
 to_regclass('public.agenda_items') as agenda_items,
 exists(select 1 from public.system_versions where version='3.0.7') as version_307,
 to_regprocedure('public.save_calendar_event(uuid,jsonb)') is not null as save_event,
 to_regprocedure('public.create_activity_from_agenda(jsonb)') is not null as create_activity,
 to_regprocedure('public.update_agenda_item(text,uuid,timestamp with time zone,timestamp with time zone,boolean)') is not null as update_item,
 to_regprocedure('public.set_agenda_item_status(text,uuid,text)') is not null as set_status;
select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='calendar_events' and column_name in('all_day','archived_at','archived_by','cancelled_at','cancelled_by') order by column_name;
select key,value from public.system_settings where key in('agenda_snap_minutes','agenda_default_view','agenda_hide_cancelled','agenda_time_zone') order by key;
