# Reaproveitamento técnico da Publicolor

Não foi localizado um ZIP externo mais recente e verificável. Foram utilizados somente padrões presentes no legado incorporado ao ZIP recebido.

| Origem | Padrão adaptado | Destino |
|---|---|---|
| `app/legacy-page.tsx` | sessão persistente, fechamento por Esc e bloqueio da rolagem | `AuthProvider`, `StudioShell`, `useBodyScrollLock` |
| `app/pcp-v2.css` | menu móvel, cards e tabelas responsivas | `app/styles/responsive.css` |
| `app/hooks/useSynchronizedKanbanScroll.ts` | referência para navegação horizontal | Kanban com rolagem horizontal nativa e acessível |
| `app/domain/locale.ts` | centralização regional | `app/config/regions.ts` |
| componentes v3 anteriores | consultas e campos já usados pelo Camilla Studio | serviços separados em `app/features/*` |

Nenhuma cor, logo, cliente, pedido, setor ou regra industrial foi transportada.
