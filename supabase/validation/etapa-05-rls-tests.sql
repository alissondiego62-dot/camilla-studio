-- Execute em homologação com usuários de perfis diferentes.
-- O arquivo apenas inspeciona policies; os cenários abaixo devem ser executados
-- com JWTs reais para validar o comportamento de ponta a ponta.
select tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public'
  and tablename in ('project_activities','activity_participants','activity_saved_views','project_comments','project_files','calendar_events')
order by tablename,policyname;

-- Cenários obrigatórios:
-- 1. colaborador atribuído consulta e edita sua atividade;
-- 2. colaborador sem vínculo não consulta atividade alheia;
-- 3. participante consulta a atividade, respeitando o escopo do perfil;
-- 4. usuário sem activities.edit não altera status, prazo ou responsável;
-- 5. visualizações salvas são acessíveis somente pelo proprietário;
-- 6. comentário/anexo vinculado à atividade respeita can_access_activity;
-- 7. ações em massa abortam integralmente se uma atividade estiver fora do escopo.
