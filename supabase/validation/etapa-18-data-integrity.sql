select count(*) as invalid_contracts from public.project_contract_financials where contract_value<0 or legacy_amount_received<0;
select count(*) as orphan_contracts from public.project_contract_financials c left join public.projects p on p.id=c.project_id where p.id is null;
select count(*) as orphan_activities from public.project_activities a left join public.projects p on p.id=a.project_id where a.project_id is not null and p.id is null;
select count(*) as orphan_events from public.calendar_events e left join public.projects p on p.id=e.project_id where e.project_id is not null and p.id is null;
