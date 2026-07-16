# Etapa 05 — Reversão

Use `supabase/rollback/camilla-stage05-activities-workspace-rollback.sql` somente após backup.

O rollback é conservador: desativa triggers operacionais e a conclusão automática, mas preserva atividades, subatividades, participantes, visualizações, comentários, anexos e histórico. Ele não restaura `ON DELETE CASCADE`, pois essa ação reintroduziria risco de perda de subatividades.

Para reverter a aplicação, publique novamente o ZIP anterior da Etapa 04.
