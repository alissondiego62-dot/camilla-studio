# Camilla Studio — Atualização Fase 7

## Supabase

Execute no SQL Editor, depois das migrations anteriores:

```sql
supabase/migrations/20260721010000_completed_projects_and_full_finance.sql
```

## Principais alterações

- Coluna **Finalizado** removida do Kanban.
- Botão **Finalizar projeto** dentro do projeto.
- Nova página **Finalizados**, agrupada pelo cadastro do cliente.
- Projetos finalizados continuam no Financeiro enquanto houver saldo.
- Financeiro global com receitas e despesas vinculadas ou avulsas.
- Lançamentos financeiros também disponíveis dentro do projeto.
- Agenda global com compromissos, vínculos com projetos e prazos.
- Layout responsivo para desktop, tablet e celular.

## Executar

```powershell
pnpm install
pnpm dev
```

## Validar

```powershell
pnpm typecheck
pnpm build
```
