-- Etapa 07 — testes de pesquisa somente de leitura
select count(*) as visible_clients from public.search_clients(null,'{}'::jsonb,500,0);
select count(*) as active_clients from public.search_clients(null,'{"include_archived":false}'::jsonb,500,0);
select count(*) as directory_rows_without_search_text from public.client_directory_view where search_text is null;
-- Para validação manual, substitua o termo por nome, CPF, CNPJ, telefone, WhatsApp ou e-mail real.
-- select id,name,cpf,cnpj,phone,whatsapp,email from public.search_clients('TERMO','{}'::jsonb,50,0);
select indexname,indexdef from pg_indexes where schemaname='public' and tablename in('clients','client_phones','client_emails') order by tablename,indexname;
