# Reversão — Etapa 04

Utilize `supabase/rollback/camilla-stage04-notifications-history-rollback.sql` somente após backup.

O rollback:

- remove triggers da Etapa 04;
- retira `notifications` do Realtime;
- restaura políticas seguras compatíveis com a Etapa 03;
- bloqueia novas gravações nas estruturas centrais;
- preserva notificações, histórico, comentários, arquivos e versões;
- não remove objetos do Storage;
- registra a desativação na versão `3.0.5`.

Depois do rollback, publique novamente o ZIP da Etapa 03 e desative os agendamentos das Edge Functions da Etapa 04.
