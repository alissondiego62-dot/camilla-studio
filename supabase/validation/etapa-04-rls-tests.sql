-- Etapa 04 — roteiro de testes RLS em homologação
-- Execute cada bloco autenticado com o perfil indicado; não use service_role.
-- 1. Colaborador: SELECT notifications deve retornar apenas user_id = auth.uid().
select count(*) filter(where user_id<>auth.uid()) as notifications_de_outros from public.notifications;
-- 2. Histórico: usuário com projeto atribuído deve vê-lo; projeto não atribuído deve ficar oculto.
select module,record_type,count(*) from public.history_entries group by module,record_type order by module,record_type;
-- 3. Comentários internos: perfil sem comments.view_internal não deve receber linhas comment_kind='internal_note'.
select count(*) as internal_notes_visible from public.project_comments where comment_kind='internal_note';
-- 4. Arquivos: SELECT deve retornar somente vínculos autorizados pelo projeto, cliente, atividade ou financeiro.
select origin,count(*) from public.project_files group by origin;
-- 5. Tente UPDATE/DELETE direto em history_entries: deve ser negado para authenticated.
-- 6. Tente consultar storage.objects do bucket linked-files sem acesso ao registro: deve retornar zero linhas.
