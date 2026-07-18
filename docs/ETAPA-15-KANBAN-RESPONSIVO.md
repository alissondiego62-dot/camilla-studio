# Etapa 15 — Kanban responsivo e miniaturas integrais

## Base

Versão baseada no pacote da Etapa 14. Alteração exclusivamente de frontend; nenhuma migration ou SQL é necessária.

## Correções

- Removido o limite vertical das colunas do Kanban.
- Removida a rolagem vertical interna que fazia os cards parecerem cortados.
- Cada coluna e cada card agora crescem conforme o conteúdo.
- Miniatura mantida em área responsiva 16:9 com `object-fit: contain`.
- Imagem posicionada de forma absoluta dentro da área da miniatura para impedir interferência de regras globais de imagem.
- Clique na miniatura abre uma janela ampliada.
- Janela ampliada renderizada em portal diretamente no `body`, fora do card e das colunas.
- Clique no fundo escuro fecha a janela.
- Botão X e tecla Escape continuam fechando a janela.
- Clique dentro da imagem ampliada não fecha a janela.
- Clique em qualquer área não interativa do card abre o projeto.
- Botões, links, seletores e atalhos internos não acionam a abertura duplicada do projeto.
- Navegação por teclado preservada.

## Arquivos alterados

- `app/components/ui/Modal.tsx`
- `app/features/kanban/ProjectKanbanCard.tsx`
- `app/styles/components.css`

## Arquivo criado

- `tests/stage15-kanban-visual.test.mjs`

## Validações

- 4 testes específicos da Etapa 15 aprovados.
- Sintaxe TypeScript/TSX dos arquivos alterados aprovada.
- 28 páginas analisadas sem colisão de rota.
- 240 arquivos TSX aprovados na auditoria estrutural de acessibilidade.
- Identidade Camilla Studio validada.

## Publicação

Não execute SQL. Substitua o código publicado pelo conteúdo deste pacote e faça uma nova implantação.
