# Camilla Studio 3.0.8

Base atual: **Etapa 07 — cadastro completo e página individual de clientes**.

## Recursos principais

- diretório de clientes com pesquisa por nome, CPF, CNPJ, telefone, WhatsApp e e-mail;
- cadastro de pessoa física e jurídica, contatos adicionais e endereço completo;
- arquivamento e reativação sem perda de vínculos;
- ficha individual em `/clients/[id]`;
- abas de visão geral, projetos, atividades, agenda, financeiro autorizado, arquivos, observações e histórico;
- integração com Projetos, Atividades, Agenda, Arquivos, Histórico e Financeiro profissional;
- proteção contra exclusão de clientes vinculados;
- RLS e RPCs com validação de permissão no banco.

## Aplicação do banco

1. Faça backup do banco e do Storage.
2. Execute `supabase/validation/etapa-07-preflight.sql`.
3. Execute somente `camilla-studio-etapa-07.sql`.
4. Execute `etapa-07-postflight.sql` e `etapa-07-data-integrity.sql`.
5. Execute os demais testes em homologação.

Não execute o SQL consolidado e a migration equivalente em sequência.

## Execução local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm dev
```

Use `.env.example` como referência. Não adicione chaves privadas ou `service_role` ao frontend.
