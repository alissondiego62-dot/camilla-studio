# Arquivos da OS por links do Google Drive

Esta atualização substitui o upload direto de arquivos na aba **Arquivos** por vínculos do Google Drive.

## O que muda

- O arquivo permanece no Google Drive.
- O Supabase salva apenas nome, categoria, versão, observação e URL.
- Remover o vínculo no sistema não exclui o arquivo do Drive.
- Links aceitos: `https://drive.google.com/...` e `https://docs.google.com/...`.

## Aplicação

1. Substitua `app/page.tsx` e `app/details.css`.
2. Execute no SQL Editor do Supabase:
   `supabase/migrations/20260715010000_google_drive_links.sql`
3. Rode `pnpm dev`.
4. Abra uma OS, entre na aba **Arquivos** e vincule um link do Drive.

## Organização recomendada

```text
Publicolor
└── Clientes
    └── Nome do cliente
        └── OS 0000
            ├── Arte
            ├── Produção
            ├── Fotos
            └── Instalação
```

A migração mantém compatibilidade com registros antigos que já possuam `file_path` no Supabase Storage.
