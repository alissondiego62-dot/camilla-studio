select version,released_at from public.system_versions
where version in('3.0.4','3.0.5','3.0.6','3.0.7','3.0.8','3.0.9','3.0.10','3.0.11')
order by released_at;
select count(*) as duplicate_versions from(select version from public.system_versions group by version having count(*)>1)x;
