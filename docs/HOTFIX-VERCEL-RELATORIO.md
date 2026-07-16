# Relatório do hotfix Vercel — rota `/users`

## Erro

```text
You cannot have two routes that resolve to the same path ("/users").
```

## Correções

- removido `app/(studio)/settings/users/page.tsx`, que continha um redirecionamento redundante;
- mantida somente a rota oficial `app/(studio)/users/page.tsx`;
- incluído teste automático contra a presença simultânea de `app/users/page.tsx` e `app/(studio)/users/page.tsx`;
- versão atualizada para `3.0.3`;
- documentação atualizada.

## Validação

- TypeScript: aprovado;
- ESLint: aprovado;
- build Vite/Vinext: aprovado;
- testes: 33 aprovados, 0 falhas;
- SQL: inalterado;
- banco de dados: nenhuma alteração realizada.
