# Camilla Studio 3.0.10

Base atual: **Etapa 09 — Dashboard, Relatórios Gerais e Google Drive**.

## Recursos principais

- Dashboard como página inicial, com dados filtrados pelo escopo do usuário;
- indicadores de projetos, atividades, Agenda, clientes, pendências e novidades;
- valores e gráficos financeiros retornados somente para usuários autorizados;
- relatórios operacionais com filtros, paginação, CSV e impressão/PDF;
- auditoria das exportações;
- Google Drive para upload, links, abertura, metadados e compartilhamento;
- tokens do Drive criptografados em schema privado;
- banco principal preservado como fonte das relações, permissões, versões e histórico;
- paleta Camilla aplicada aos gráficos e relatórios;
- versão e informações do sistema atualizadas para 3.0.10.

## Aplicação do banco

1. Faça backup do banco e do Storage.
2. Execute `supabase/validation/etapa-09-preflight.sql`.
3. Execute somente `camilla-studio-etapa-09.sql`.
4. Execute `etapa-09-postflight.sql` e `etapa-09-data-integrity.sql`.
5. Execute os testes de Dashboard, relatórios, Drive e RLS em homologação.
6. Configure os secrets e publique as três Edge Functions do Google Drive.
7. Publique o projeto atualizado.

Não execute o SQL consolidado e a migration equivalente em sequência. O SQL interno da Etapa 08 já contém o hotfix de dependência das views financeiras.

## Execução local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Use `.env.example` apenas como referência. Chaves privadas, refresh tokens e `service_role` pertencem aos Supabase Secrets, nunca ao frontend.
