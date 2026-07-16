# Etapa 04 — Comentários e observações internas

## Recursos

- comentário comum;
- observação interna;
- respostas encadeadas;
- menções por usuário;
- edição;
- exclusão lógica;
- marcação de importante;
- leitura individual;
- histórico.

## Edição

O autor pode editar dentro da janela padrão de 15 minutos. Depois disso, a edição depende de permissão com escopo total. Usuários autorizados também podem corrigir comentários de terceiros. Todas as edições são registradas.

## Menções

Somente usuários ativos com acesso ao projeto podem ser mencionados. Observações internas exigem também permissão para visualizar conteúdo interno. O mencionado recebe uma notificação específica e não recebe uma segunda notificação genérica do mesmo comentário.

## Exclusão

A exclusão é lógica por `deleted_at` e `deleted_by`. O conteúdo permanece no banco para auditoria.

## Leitura

`comment_reads` e `record_views` permitem contagem individual de não lidos. Abrir a seção Comentários registra a visualização e remove o indicador apenas para aquele usuário.
