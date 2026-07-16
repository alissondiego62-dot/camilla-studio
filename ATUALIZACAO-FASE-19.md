# Camilla Studio — Fase 19

## Incorporado do modelo Publicolor

- Kanban com espaço de miniatura/capa em todos os cards.
- Agenda mensal visual, além da lista operacional já existente.
- Módulo de Atividades com grupos, responsável, prioridade, prazo, conclusão e vínculo opcional ao projeto.
- Configurações ampliadas com preparação para Google Drive, sincronização e miniaturas.
- Migration para atividades, conexão Drive, pastas de projeto e metadados de miniatura.

## Google Drive

A interface está preparada, mas a conexão real exige configurar OAuth no Google Cloud e criar as rotas de servidor. Variáveis previstas:

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY

Nunca grave refresh tokens sem criptografia.

## Banco

Execute primeiro as migrations anteriores, incluindo a criação de `public.profiles`. Depois execute:

`supabase/migrations/20260727010000_camilla_activities_drive_thumbnails.sql`
