# Aplicação da Etapa 02

## Antes de aplicar

1. Faça backup do banco Supabase.
2. Confirme que está no projeto **Camila**, não no projeto Publicolor PCP.
3. Execute `supabase/validation/etapa-02-preflight.sql` no SQL Editor.
4. Revise qualquer exceção apresentada.

## Ordem obrigatória

1. `camilla-studio-etapa-02.sql`
2. `supabase/validation/etapa-02-postflight.sql`
3. `supabase/validation/etapa-02-rls-tests.sql` em homologação ou com usuários de teste controlados.
4. Implantar as Edge Functions.
5. Configurar os segredos das Edge Functions.
6. Testar os oito perfis.

O arquivo consolidado é idêntico a:

`supabase/migrations/20260716090000_camilla_stage02_admin_security.sql`

Não execute os dois arquivos; escolha somente um deles.

## Edge Functions

Implantar:

```bash
npx supabase functions deploy admin-manage-user --project-ref SEU_PROJECT_REF
npx supabase functions deploy admin-create-user --project-ref SEU_PROJECT_REF
npx supabase functions deploy auth-audit --no-verify-jwt --project-ref SEU_PROJECT_REF
```

`admin-create-user` é mantida como compatibilidade. A interface nova utiliza `admin-manage-user`.

Configure em **Supabase Edge Function Secrets**, nunca no frontend:

- `SITE_URL`
- `ALLOWED_ORIGINS` — lista separada por vírgula
- `AUDIT_HASH_SALT` — valor aleatório longo

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` devem existir somente no ambiente seguro da Edge Function. A service role nunca deve ser colocada em variável `NEXT_PUBLIC_*`.

## Validação

O postflight confirma:

- oito perfis ativos;
- catálogo e matriz de permissões;
- funções de autorização;
- RLS habilitada;
- ausência de políticas amplas com `TRUE` nas tabelas governadas.

Depois da implantação, teste login, bloqueio, revogação de sessão, acesso por projeto atribuído, Financeiro Pessoal e Financeiro Profissional.

## Configuração manual recomendada no Supabase Auth

Ative **Leaked Password Protection** nas configurações de senha do Supabase Auth. O advisor do projeto indicou que essa proteção está desabilitada; ela não é alterada por SQL de tabela.

## Situação desta entrega

Foi executada uma auditoria remota somente de leitura. O SQL e as Edge Functions não foram aplicados no banco remoto durante a geração do pacote, para não fragmentar uma migration transacional grande nem alterar produção sem uma execução integral pelo SQL Editor/CLI. As permissões de banco tornam-se efetivas após os passos acima.
