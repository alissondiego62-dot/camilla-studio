# Camilla Studio — Arquitetura da Etapa 01

A aplicação utiliza um grupo de rotas `(studio)` para manter as URLs existentes e compartilhar o shell autenticado. Cada domínio possui uma pasta própria em `app/features`, com página, tipos e serviço de dados. O layout, autenticação e navegação permanecem montados durante a troca de páginas.

## Rotas preservadas
`/dashboard`, `/projects`, `/kanban`, `/activities`, `/agenda`, `/clients`, `/finance`, `/files`, `/reports`, `/users` e `/settings`.

## Identidade
- Logo: `public/brand/camilla-studio-logo.png`
- Paleta: `public/brand/camilla-studio-palette.png`
- Cores: `#5E3021`, `#9B6352`, `#D3C0BD`, `#EFEAE7`
- Correção: RGB `239, 234, 231`.
