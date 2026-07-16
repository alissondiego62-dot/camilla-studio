# Etapa 04 — Arquivos e versões

## Vínculos aceitos

Um arquivo pode estar relacionado a projeto, cliente, atividade ou lançamento financeiro. As permissões são verificadas no banco conforme a entidade e o ambiente financeiro.

## Origens

- `supabase_storage`: arquivo enviado ao bucket privado `linked-files`.
- `google_drive`: link e metadados do Google Drive.
- `external_link`: link externo controlado pelo banco.

## Versionamento

- `version_group_id` identifica a família completa de versões.
- `version` é único dentro da família.
- `replaces_file_id` aponta para a versão imediatamente anterior.
- A substituição cria uma nova linha e arquiva a anterior.
- O arquivo anterior não é removido automaticamente do Storage.

## Operações

- anexar;
- editar metadados;
- substituir;
- abrir por URL assinada;
- baixar quando `download_allowed` estiver ativo;
- arquivar logicamente;
- consultar versões.

## Storage

O caminho segue `entidade/uuid/arquivo-uuid/nome`. O bucket é privado, limitado a 50 MB e protegido por políticas que validam a entidade relacionada. Upload e substituição possuem permissões de leitura, inclusão e atualização.
