# Etapa 14 — Miniaturas e interação do Kanban

## Alterações

- Miniatura do card exibida integralmente com `object-fit: contain`.
- Área da imagem mantida responsiva em proporção 16:9.
- Clique na miniatura abre visualização ampliada em modal.
- Clique nas demais áreas não interativas do card abre o projeto.
- Links, seletores e botões internos não disparam a abertura do projeto.
- Card acessível por teclado com Enter ou Espaço.
- Atalho de Histórico restaurado no rodapé do card.
- Aba Histórico removida da navegação principal.
- Grade do rodapé adaptada para quatro atalhos mais o responsável.

## Banco de dados

Nenhuma alteração de banco foi necessária.

## Arquivos alterados

- `app/features/kanban/ProjectKanbanCard.tsx`
- `app/features/kanban/KanbanCardShortcuts.tsx`
- `app/config/navigation.ts`
- `app/styles/components.css`

## Observação de validação

A estrutura foi inspecionada estaticamente. O pacote não contém `node_modules`; portanto, build, lint e typecheck devem ser executados no ambiente local após instalar as dependências.
