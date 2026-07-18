# Camilla Studio 3.0.17

Base atual: **Etapa 17 — Saldo contratual integrado e confidencial**.

## Recursos principais

- projetos, Kanban, atividades, Agenda, clientes e checklists integrados;
- Financeiro profissional centralizado;
- valor do contrato, valor recebido e saldo a receber por projeto;
- datas previstas e lançamentos do projeto compartilhados com o Financeiro geral;
- posição contratual consolidada na página Financeiro;
- valores contratuais exibidos na listagem e na ficha dos projetos;
- acesso financeiro restrito aos perfis `administrator` e `owner` no frontend e no banco;
- notificações, comentários, anexos, Google Drive e auditoria;
- interface responsiva e identidade Camilla Studio.

## Aplicação da Etapa 17

1. Faça backup do banco.
2. Execute `supabase/validation/etapa-17-preflight.sql`.
3. Execute somente `camilla-studio-etapa-17-saldo-contratual.sql`.
4. Execute:
   - `supabase/validation/etapa-17-postflight.sql`;
   - `supabase/validation/etapa-17-data-integrity.sql`;
   - `supabase/validation/etapa-17-security-tests.sql`.
5. Encerre e reabra as sessões dos usuários para recarregar as permissões.
6. Publique o projeto atualizado.

Não execute o SQL consolidado e a migration equivalente em sequência. Os dois arquivos possuem o mesmo conteúdo.

## Execução local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Use `.env.example` apenas como referência. Chaves privadas, refresh tokens e `service_role` devem permanecer nos Supabase Secrets.
