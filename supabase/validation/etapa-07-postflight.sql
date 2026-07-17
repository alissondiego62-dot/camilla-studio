-- Etapa 07 — confirmação estrutural
select
 exists(select 1 from public.system_versions where version='3.0.8') as version_308,
 to_regclass('public.client_phones') as client_phones,
 to_regclass('public.client_emails') as client_emails,
 to_regclass('public.client_notes') as client_notes,
 to_regclass('public.financial_entry_payments') as financial_entry_payments,
 to_regclass('public.client_directory_view') as client_directory_view,
 to_regclass('public.client_financial_summary_view') as client_financial_summary_view;
select
 to_regprocedure('public.save_client(uuid,jsonb)') is not null as save_client,
 to_regprocedure('public.archive_client(uuid)') is not null as archive_client,
 to_regprocedure('public.reactivate_client(uuid)') is not null as reactivate_client,
 to_regprocedure('public.delete_client_safely(uuid)') is not null as delete_client_safely,
 to_regprocedure('public.search_clients(text,jsonb,integer,integer)') is not null as search_clients,
 to_regprocedure('public.get_client_financial_workspace(uuid)') is not null as financial_workspace;
select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='clients' and column_name in('legal_name','trade_name','whatsapp','postal_code','internal_responsible_user_id','source_code','segment_code','updated_by','archived_by') order by column_name;
select column_name,data_type from information_schema.columns where table_schema='public' and table_name='agenda_items' and column_name in('client_id','client_name') order by column_name;
