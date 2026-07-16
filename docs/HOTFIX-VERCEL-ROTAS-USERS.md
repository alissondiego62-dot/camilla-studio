# Hotfix Vercel — colisão da rota `/users`

## Erro corrigido

```text
You cannot have two routes that resolve to the same path ("/users").
```

## Causa

A rota oficial é:

```text
app/(studio)/users/page.tsx
```

A pasta entre parênteses é um grupo de rotas e não aparece na URL. Portanto, o endereço público continua sendo `/users`.

Quando o projeto novo é copiado por cima de uma versão antiga, o Git pode manter também:

```text
app/users/page.tsx
```

Os dois arquivos geram `/users`. O redirecionamento redundante em `app/(studio)/settings/users/page.tsx` também foi removido para evitar divergências no scanner de rotas do Vinext.

## Publicação correta

Antes de copiar este pacote para o repositório, remova os arquivos antigos ou substitua integralmente o conteúdo do projeto. Confirme que existe somente:

```text
app/(studio)/users/page.tsx
```

E que não existem:

```text
app/users/page.tsx
app/(studio)/settings/users/page.tsx
```
