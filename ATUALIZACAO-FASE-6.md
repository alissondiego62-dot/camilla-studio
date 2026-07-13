# Atualização — Fase 6

## Edição em rascunho

Os campos da visão geral do projeto não são mais enviados ao Supabase imediatamente.

Campos cobertos:

- etapa;
- status;
- responsável;
- prazo principal;
- valor do contrato;
- datas das três entregas planejadas.

Ao fechar o painel do projeto, o sistema verifica se existem alterações pendentes. Se houver, pergunta se o usuário deseja salvar. Ao confirmar, todos os campos alterados são gravados em uma única operação. O gatilho já existente no Supabase registra cada alteração no histórico.

Se a confirmação for recusada, o painel fecha e as alterações locais são descartadas.

## Kanban

Foi adicionada uma segunda barra de rolagem horizontal na parte superior do Kanban. Ela é sincronizada com a barra inferior nativa do quadro.

## Banco de dados

Esta fase não exige uma nova migration.
