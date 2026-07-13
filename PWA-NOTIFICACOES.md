# PWA e notificações da agenda

## 1. Aplicar a migration

No SQL Editor do Supabase, execute:

`supabase/migrations/20260724010000_pwa_push_notifications.sql`

## 2. Gerar chaves VAPID

No terminal, dentro do projeto:

```bash
npx web-push generate-vapid-keys
```

Adicione a chave pública ao `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=SUA_CHAVE_PUBLICA
```

Não coloque a chave privada no frontend.

## 3. Configurar e publicar a Edge Function

```bash
supabase functions deploy send-agenda-notifications --no-verify-jwt
supabase secrets set VAPID_PUBLIC_KEY=SUA_CHAVE_PUBLICA
supabase secrets set VAPID_PRIVATE_KEY=SUA_CHAVE_PRIVADA
supabase secrets set VAPID_SUBJECT=mailto:SEU_EMAIL
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizadas pelo ambiente da Edge Function.

## 4. Agendar a função a cada minuto

No Supabase, habilite as extensões `pg_cron` e `pg_net`. Guarde a URL e a chave anon no Vault e execute, ajustando o nome dos segredos se necessário:

```sql
select cron.schedule(
  'send-agenda-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-agenda-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

A função foi publicada com `--no-verify-jwt`; a chamada também pode ser feita sem o cabeçalho Authorization. O acesso aos dados utiliza a service role somente dentro da função.

## 5. Instalar no iPhone

1. Publique o sistema em HTTPS.
2. Abra no Safari do iPhone.
3. Toque em Compartilhar.
4. Toque em Adicionar à Tela de Início.
5. Abra pelo ícone Camilla Studio.
6. Vá em Configurações e toque em Ativar notificações.

## Regras implementadas

- Resumo diário às 08:00 no fuso do aparelho.
- Alerta 10 minutos antes de cada compromisso.
- Compromissos concluídos não geram alertas.
- Assinaturas inválidas são desativadas automaticamente.
- Entregas duplicadas são bloqueadas pela tabela `notification_deliveries`.
