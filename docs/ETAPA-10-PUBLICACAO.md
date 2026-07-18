# Publicação da versão final

## Banco
1. Backup do banco e Storage.
2. Execute `supabase/validation/etapa-10-preflight.sql`.
3. Execute somente `camilla-studio-etapa-10-final.sql`.
4. Execute postflight, integridade, segurança e performance.
5. Execute testes RLS com perfis reais em homologação.

## Aplicação
```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Publique o projeto na Vercel utilizando as mesmas variáveis públicas e secrets já configurados. Não envie `.env` ao repositório.

## Google Drive
Mantenha as três Edge Functions da Etapa 09 publicadas e os secrets configurados. Teste OAuth, upload e compartilhamento em homologação antes de liberar a integração em produção.
