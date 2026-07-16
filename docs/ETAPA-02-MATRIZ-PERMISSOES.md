# Matriz de permissões — Etapa 02

## Modelo

Cada concessão é resolvida por **módulo + ação + escopo**. Os escopos são:

| Escopo | Significado |
|---|---|
| `none` | sem acesso |
| `own` | registros criados ou pertencentes ao próprio usuário |
| `assigned` | projetos, atividades, eventos e arquivos atribuídos |
| `team` | registros atribuídos à equipe do usuário |
| `all` | todos os registros permitidos pelo módulo |

A ordem de resolução é: bloqueio/sessão revogada → exceção individual → perfil → negação.

## Perfis iniciais

| Perfil | Operação | Financeiro profissional | Financeiro pessoal | Administração |
|---|---|---|---|---|
| Administrador | total | total | **negado por padrão** | total |
| Proprietária | total | total | total | total |
| Gestor | todos os projetos, atividades, agenda, clientes, arquivos e relatórios operacionais | negado | negado | sem usuários/segurança |
| Financeiro | consulta mínima de projetos e clientes | total | negado | sem usuários/configurações |
| Arquiteto | registros atribuídos, com edição operacional | negado | negado | negado |
| Colaborador | registros atribuídos; atualização limitada de atividades/checklists | negado | negado | negado |
| Assistente | registros atribuídos; apoio em agenda, arquivos e checklists | negado | negado | negado |
| Somente leitura | leitura dos registros atribuídos | negado | negado | negado |

## Módulos e ações

- Dashboard: visualizar.
- Projetos: visualizar, criar, editar, excluir, arquivar, reativar, aprovar, exportar, alterar status, etapa e prazo.
- Kanban: visualizar, alterar status, etapa e prazo.
- Atividades: visualizar, criar, editar, excluir, alterar status e prazo.
- Agenda: visualizar, criar, editar, excluir e exportar.
- Clientes: visualizar, criar, editar, excluir, arquivar, reativar e exportar.
- Arquivos: visualizar, adicionar, remover e exportar.
- Relatórios: visualizar, exportar e visualizar valores.
- Financeiro profissional e pessoal: visualizar, criar, editar, arquivar, visualizar valores, realizar baixa, cancelar e exportar.
- Usuários e equipes: visualizar, criar, editar, arquivar, reativar e gerenciar usuários.
- Configurações, notificações, integrações, versões e segurança: visualizar e gerenciar conforme o módulo.
- Checklists: visualizar, criar, editar, excluir, arquivar, reativar e gerenciar configurações.

## Exceções individuais

A tabela `user_permission_overrides` permite conceder ou negar uma ação a um usuário, com escopo, justificativa e expiração. Ela é usada, por exemplo, para autorizar explicitamente uma pessoa ao Financeiro Pessoal sem alterar o perfil inteiro.
