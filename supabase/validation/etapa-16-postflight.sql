select column_name,data_type from information_schema.columns where table_schema='public' and table_name='financial_entries' and column_name in('deletion_reason','deleted_at','deleted_by') order by column_name;
select to_regprocedure('public.remove_financial_entry(uuid,text)') as remove_financial_entry;
select * from public.system_versions where version='3.0.16';
