-- Etapa 06 — testes de sincronização em homologação
-- Execute com um usuário autenticado e substitua os UUIDs de exemplo.
-- O bloco usa transação e deve ser encerrado com ROLLBACK.
begin;
-- select public.update_agenda_item('activity','00000000-0000-4000-8000-000000000000','2026-07-20 09:00-04','2026-07-20 10:00-04',false);
-- select starts_at,due_at,all_day from public.project_activities where id='00000000-0000-4000-8000-000000000000';
-- select public.update_agenda_item('event','00000000-0000-4000-8000-000000000000','2026-07-21 14:00-04','2026-07-21 15:30-04',false);
-- select starts_at,ends_at,all_day from public.calendar_events where id='00000000-0000-4000-8000-000000000000';
-- select public.update_agenda_item('project_date','00000000-0000-4000-8000-000000000000','2026-07-22 17:00-04','2026-07-22 18:00-04',true);
-- select starts_at,ends_at,all_day from public.project_dates where id='00000000-0000-4000-8000-000000000000';
rollback;
