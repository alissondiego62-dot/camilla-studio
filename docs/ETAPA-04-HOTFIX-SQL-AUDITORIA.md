# Camilla Studio — Hotfix da Etapa 04

## Problema corrigido

A primeira versão do SQL da Etapa 04 falhava ao executar o gatilho `log_admin_central_history()` durante a atualização de `system_settings`.

Mensagem observada:

```text
ERROR: 42703: record "new" has no field "id"
```

A função era compartilhada por tabelas com chaves diferentes. `profiles`, `profile_permissions` e `user_permission_overrides` usam `id`, enquanto `system_settings` usa `key`. O acesso direto a `NEW.id` dentro de um `CASE` ainda era avaliado pelo PostgreSQL para a estrutura do registro do gatilho e causava erro.

## Correção aplicada

A linha do gatilho agora é convertida para `JSONB` antes da leitura da chave:

- tabelas administrativas comuns: `row_value ->> 'id'`;
- `system_settings`: `row_value ->> 'key'`.

Isso evita qualquer referência a um campo inexistente no tipo de linha da tabela.

## Estado do banco após o erro

Foi realizada uma auditoria somente de leitura no projeto Supabase Camila. O banco confirmou rollback completo:

- `public.notifications`: não criada;
- `public.history_entries`: não criada;
- `public.record_views`: não criada;
- `public.file_versions`: não criada;
- versão `3.0.5`: não registrada.

Portanto, não é necessário executar rollback antes de aplicar o SQL corrigido.

## Procedimento correto

1. Não execute novamente o SQL anterior.
2. Abra o arquivo `camilla-studio-etapa-04-hotfix.sql`.
3. Execute o conteúdo completo uma única vez no SQL Editor do Supabase.
4. Após sucesso, execute:
   - `supabase/validation/etapa-04-postflight.sql`;
   - `supabase/validation/etapa-04-data-integrity.sql`;
   - `supabase/validation/etapa-04-notification-tests.sql`.
5. Execute os testes RLS apenas em ambiente controlado/homologação.

## Validações do hotfix

- TypeScript: aprovado, zero erros.
- ESLint: aprovado, zero erros.
- Build Vite/Vinext/Nitro: aprovado.
- Testes automatizados: 52 aprovados, zero falhas.
- Teste de regressão do gatilho administrativo: aprovado.
- Parser PostgreSQL: oito arquivos SQL aprovados.
- SQL consolidado e migration: conteúdo idêntico.
- Banco remoto: nenhuma alteração realizada durante a correção.
