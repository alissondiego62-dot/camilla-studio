# Etapa 09 — Edge Functions do Google Drive

## Secrets obrigatórios
Configure no Supabase, sem inserir valores no repositório:
- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `SITE_URL`;
- `ALLOWED_ORIGINS`;
- `GOOGLE_DRIVE_CLIENT_ID`;
- `GOOGLE_DRIVE_CLIENT_SECRET`;
- `GOOGLE_DRIVE_REDIRECT_URI`;
- `GOOGLE_DRIVE_SCOPES`;
- `GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY` — 32 bytes em Base64.

## Publicação
```bash
supabase functions deploy google-drive-oauth --no-verify-jwt
supabase functions deploy google-drive-files
supabase functions deploy google-drive-share
```

O callback OAuth é uma requisição externa do Google e, por isso, `google-drive-oauth` precisa aceitar o callback sem JWT. A própria função valida estado, validade, origem e sessão nas ações iniciadas pelo sistema.

## URI de redirecionamento
Cadastre no Google Cloud a URL exata:
```text
https://<PROJECT_REF>.supabase.co/functions/v1/google-drive-oauth
```

## Ativação visual
Depois de configurar os secrets e testar a conexão:
```sql
update public.system_settings
set value='true'::jsonb, updated_at=now()
where key='google_drive_oauth_configured';
```
