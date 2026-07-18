select
 (select count(*) from public.projects p left join public.clients c on c.id=p.client_id where p.client_id is not null and c.id is null) as orphan_projects_clients,
 (select count(*) from public.project_activities a left join public.projects p on p.id=a.project_id where a.project_id is not null and p.id is null) as orphan_activities_projects,
 (select count(*) from public.project_activities a left join public.project_activities parent on parent.id=a.parent_id where a.parent_id is not null and parent.id is null) as orphan_subactivities,
 (select count(*) from public.financial_entry_payments pay left join public.financial_entries entry on entry.id=pay.financial_entry_id where entry.id is null) as orphan_payments,
 (select count(*) from public.project_files where num_nonnulls(project_id,client_id,activity_id,financial_entry_id)=0) as files_without_relation;
select count(*) as duplicate_project_codes from(select code from public.projects group by code having count(*)>1)x;
select count(*) as invalid_financial_precision from public.financial_entries where amount <> round(amount,2);
