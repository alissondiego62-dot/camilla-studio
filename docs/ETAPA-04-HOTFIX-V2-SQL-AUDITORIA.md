# Camilla Studio — Etapa 04 — Hotfix V2 do SQL de auditoria

## Motivo

O primeiro arquivo SQL de hotfix entregue separadamente ainda continha a implementação antiga de `public.log_admin_central_history()`, com acesso direto a `NEW.id`, `OLD.id`, `NEW.key` e `OLD.key`.

Ao executar o `INSERT ... ON CONFLICT` em `public.system_settings`, o trigger recebeu um registro cujo identificador é `key`, não `id`, e o PostgreSQL gerou:

```text
ERROR: 42703: record "new" has no field "id"
```

A transação foi revertida integralmente. Não foi necessário rollback adicional.

## Correção efetiva

A função agora converte `NEW` ou `OLD` para JSONB e só depois lê a chave apropriada:

```sql
row_value := case
  when tg_op = 'DELETE' then to_jsonb(old)
  else to_jsonb(new)
end;

record_value := case
  when tg_table_name = 'system_settings' then row_value ->> 'key'
  else row_value ->> 'id'
end;
```

A função corrigida não contém acesso direto a `NEW.id`, `OLD.id`, `NEW.key` ou `OLD.key`.

## Arquivos corrigidos

- `camilla-studio-etapa-04.sql`
- `supabase/migrations/20260716190000_camilla_stage04_notifications_history.sql`
- arquivo avulso `camilla-studio-etapa-04-hotfix-v2.sql`

As três cópias são byte a byte idênticas.

## Validações

- 10 testes estruturais da Etapa 04: aprovados;
- teste específico da função de auditoria: aprovado;
- parser PostgreSQL (`pglast`): aprovado nas três cópias;
- comparação entre SQL consolidado e migration: aprovada;
- auditoria do banco remoto: confirmou rollback completo da tentativa anterior.

## Aplicação

1. Não reutilize as consultas salvas que apresentaram o erro.
2. Abra uma nova consulta no SQL Editor.
3. Copie integralmente `camilla-studio-etapa-04-hotfix-v2.sql`.
4. Execute uma única vez.
5. Execute os arquivos de validação da Etapa 04, nesta ordem:
   - `etapa-04-postflight.sql`;
   - `etapa-04-data-integrity.sql`;
   - `etapa-04-notification-tests.sql`.

Não execute o SQL consolidado e a migration equivalente em sequência.
