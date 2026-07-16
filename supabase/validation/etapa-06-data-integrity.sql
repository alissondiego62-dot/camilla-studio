-- Etapa 06 — integridade sem alteração
select count(*) as invalid_event_ranges from public.calendar_events where ends_at is not null and ends_at<starts_at;
select count(*) as duplicate_item_keys from (select item_key,count(*) from public.agenda_items group by item_key having count(*)>1) duplicated;
select source_type,count(*) as total from public.agenda_items group by source_type order by source_type;
select count(*) as orphan_event_activity_links from public.calendar_events e left join public.project_activities a on a.id=e.activity_id where e.activity_id is not null and a.id is null;
select count(*) as activity_items_without_dates from public.agenda_items where source_type='activity' and starts_at is null;
select count(*) as archived_events_visible from public.agenda_items i join public.calendar_events e on i.source_type='event' and i.source_id=e.id where e.archived_at is not null;
