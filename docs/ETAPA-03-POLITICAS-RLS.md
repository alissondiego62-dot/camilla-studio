# Etapa 03 — Políticas RLS

## `project_dates`

- `SELECT`: exige acesso ao projeto;
- `INSERT`: exige acesso ao projeto e permissão para alterar prazo;
- `UPDATE`: exige acesso ao projeto e permissão para alterar prazo;
- exclusão física não é concedida; a remoção usa arquivamento por RPC.

## `project_thumbnails`

- `SELECT`: exige acesso ao projeto;
- inserção e atualização direta não são concedidas ao cliente;
- ativação e remoção usam funções protegidas com validação de projeto, caminho, formato e tamanho.

## `storage.objects`

O bucket `project-thumbnails` possui políticas separadas para:

- leitura da miniatura ativa;
- inclusão;
- atualização;
- exclusão.

As políticas validam o UUID do projeto no caminho e as permissões `files.add_file` ou `files.remove_file`.

## Funções privilegiadas

As RPCs usam `SECURITY DEFINER` somente quando precisam executar uma operação transacional ou coordenar tabelas protegidas. Todas validam `auth.uid()`, acesso ao projeto e a permissão correspondente. A execução é revogada de `PUBLIC` e `anon`; apenas as funções de negócio necessárias são concedidas a `authenticated`.

A view `project_kanban_view` usa `security_invoker=true`, preservando as RLS das tabelas consultadas.
