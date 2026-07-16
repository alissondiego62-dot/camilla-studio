# Camilla Studio 3.0

## Conteúdo desta versão

- Rotas independentes para Dashboard, Projetos, Kanban, Atividades, Agenda, Clientes, Financeiro, Arquivos, Relatórios, Usuários e Configurações.
- Interface oficial Camilla Studio com logo e paleta centralizada.
- Paleta: `#5E3021`, `#9B6352`, `#D3C0BD`, `#EFEAE7`.
- Correção aplicada: RGB final do off-white `239, 234, 231`.
- Supabase como única origem de dados. Não há registros demonstrativos nas novas páginas.
- CRUD inicial conectado para projetos, atividades, eventos, clientes, lançamentos financeiros e links de arquivos.
- Kanban com arrastar e soltar e atualização otimista.
- Financeiro separado entre Pessoal e Profissional.
- Migration complementar `20260729010000_camilla_studio_v3.sql`.

## Instalação

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm dev
```

## Banco

1. Faça backup do Supabase.
2. Aplique as migrations em ordem cronológica.
3. Aplique por último `20260729010000_camilla_studio_v3.sql`.
4. Valide RLS com usuários de cada perfil antes de publicar.

## Variáveis

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Não publique chaves privadas no repositório.
