# Etapa 03 — Testes

## Automatizados

- tipagem TypeScript;
- ESLint;
- build Vite/Vinext/Nitro;
- renderização das rotas, incluindo `/projects/[id]`;
- ausência de colisão de rotas;
- estrutura de datas e miniaturas;
- nomenclatura Estudo Preliminar;
- exclusão de Obra do fluxo ativo;
- atualização otimista do card com rollback;
- formatos de miniatura;
- presença de RLS, Storage e RPCs no SQL.

## Kanban

A estrutura testa:

- `draggable` condicionado à permissão;
- mudança por seletor como alternativa a mouse/toque/teclado;
- atualização somente do projeto alterado;
- retorno ao estado anterior quando a RPC falha;
- sincronização da barra horizontal superior e inferior;
- atalhos para Histórico, Arquivos, Agenda e Comentários.

## Banco

Os arquivos de validação verificam:

- etapa Obra retirada;
- prazo principal único;
- sincronização com `projects.main_deadline`;
- miniaturas ativas com objeto no Storage;
- ausência de dispensas sem justificativa;
- RLS e privilégios das funções.

Testes de perfil com dados reais devem ser executados em homologação com usuários representativos, sem inserir dados fictícios permanentes em produção.
