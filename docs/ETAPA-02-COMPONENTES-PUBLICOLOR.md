# Reaproveitamento técnico da Publicolor

Não foi localizado um ZIP independente mais recente e verificável da Publicolor. Foram analisados o legado incorporado à base e os arquivos técnicos disponíveis.

| Origem | Padrão reaproveitado | Adaptação para Camilla Studio |
|---|---|---|
| `app/legacy-page.tsx` | sessão, leitura de perfil, feedback de erro e confirmação após resposta | substituído por `AuthProvider`, matriz granular e mensagens da Camilla |
| `app/pcp-v2.css` | drawer móvel, bloqueio do fundo, tabelas/cards responsivos, largura mínima de 320 px | refeito com tokens `--cs-*` e identidade da Camilla |
| `app/hooks/useSynchronizedKanbanScroll.ts` | padrão de hook isolado | mantido como referência funcional; sem regras industriais |
| migrations legadas | RLS, histórico e proteção de função | reescrito para projetos, perfis, escopos e segurança da Camilla |
| formulários legados | não fechar modal antes da resposta do banco | aplicado em usuários, equipes, permissões, configurações e checklists |

Não foram copiados logo, cores, clientes, pedidos, setores, OPs, dados, textos ou regras industriais da Publicolor.
