# Camilla Studio — Fase 18

## Entregue nesta fase

- Base de perfis próprios do escritório: administrador, gerente de projetos, colaborador e visualizador.
- Tabela `project_members` para atribuir colaboradores a projetos.
- RLS para o colaborador consultar apenas projetos atribuídos.
- Agenda limitada a eventos atribuídos ou vinculados a projetos permitidos.
- Financeiro isolado para administrador e gerente de projetos.
- Interface ocultando Financeiro, Clientes, Configurações e Dashboard administrativo para colaboradores.
- Estrutura de banco para integração Google Drive:
  - pastas por projeto e categoria;
  - metadados de arquivos;
  - revisão e aprovação;
  - sessões de upload retomável;
  - configurações e tokens protegidos;
  - auditoria administrativa.

## Como aplicar

1. Faça backup do Supabase da Camilla.
2. Execute `supabase/migrations/20260726010000_camilla_project_access_drive_base.sql` no SQL Editor.
3. Defina a Camilla como administradora:

```sql
update public.profiles
set camilla_role = 'admin'
where lower(email) = lower('EMAIL_DA_CAMILLA');
```

4. Cadastre os demais usuários pelo Supabase Auth e confirme que existe uma linha correspondente em `profiles`.
5. Atribua o colaborador ao projeto:

```sql
insert into public.project_members(project_id,user_id,member_role,is_primary)
values ('ID_DO_PROJETO','ID_DO_USUARIO','collaborator',false)
on conflict (project_id,user_id) do update
set member_role = excluded.member_role;
```

## Google Drive

A migration deixa o banco pronto para a integração avançada da Publicolor. A conexão OAuth e as rotas de upload ainda precisam receber as credenciais Google da Camilla no ambiente de implantação antes de serem habilitadas.

Variáveis previstas:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
DRIVE_TOKEN_ENCRYPTION_KEY=
```

Nesta fase não há envio de e-mail ao cliente.
