# Aplicação do SQL — Etapa 04

## Pré-requisitos

- Etapa 02 aplicada.
- Etapa 03 aplicada.
- Backup do banco e do Storage.
- Usuário administrador ativo.

## Ordem

1. Execute `supabase/validation/etapa-04-preflight.sql`.
2. Revise os resultados e confirme que Projetos, Histórico, Datas, Arquivos e Comentários existem.
3. Execute **somente** `camilla-studio-etapa-04.sql` no SQL Editor.
4. Execute `supabase/validation/etapa-04-postflight.sql`.
5. Execute `supabase/validation/etapa-04-data-integrity.sql`.
6. Execute `supabase/validation/etapa-04-notification-tests.sql`.
7. Execute `supabase/validation/etapa-04-rls-tests.sql` em homologação, autenticado com os perfis indicados.

Não execute o SQL consolidado e `supabase/migrations/20260716190000_camilla_stage04_notifications_history.sql` em sequência: são cópias idênticas.

## Edge Functions

Implante após o SQL:

```bash
supabase functions deploy generate-deadline-notifications --no-verify-jwt
supabase functions deploy dispatch-notifications --no-verify-jwt
supabase functions deploy send-agenda-notifications --no-verify-jwt
```

As três funções possuem autenticação própria por `x-cron-secret`. Configure no Supabase:

- `CRON_SECRET`;
- `VAPID_PUBLIC_KEY`;
- `VAPID_PRIVATE_KEY`;
- `VAPID_SUBJECT`.

Agende primeiro `generate-deadline-notifications` e depois `dispatch-notifications`. Nunca coloque esses segredos em variáveis `NEXT_PUBLIC_*`.

## Confirmações

- versão `3.0.5` em `system_versions`;
- tabela `notifications` na publicação `supabase_realtime`;
- bucket `linked-files` com `public = false`;
- histórico importado sem duplicações;
- nenhum tipo de entrega sem catálogo;
- nenhuma política `USING (true)` ou `WITH CHECK (true)` nas estruturas da etapa.
