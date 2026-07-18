select indexname,indexdef from pg_indexes where schemaname='public' and indexname like 'idx_stage10_%' order by indexname;
select relname,n_live_tup,n_dead_tup,last_analyze,last_autoanalyze
from pg_stat_user_tables
where relname in('projects','project_activities','calendar_events','clients','financial_entries','history_entries','notifications','project_files')
order by relname;
