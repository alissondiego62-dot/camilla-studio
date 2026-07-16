# Testes por perfil

Use usuários de homologação e reverta os registros de teste ao final.

| Perfil | Deve conseguir | Deve ser negado |
|---|---|---|
| Administrador | usuários, configurações, operação e financeiro profissional | financeiro pessoal sem exceção |
| Proprietária | todos os módulos e ambos os financeiros | nenhuma função prevista |
| Gestor | todos os projetos, Kanban, atividades, agenda, clientes e relatórios operacionais | usuários, segurança e financeiros |
| Financeiro | financeiro profissional e consulta mínima de projetos/clientes | financeiro pessoal, usuários e configurações |
| Arquiteto | projetos/atividades/eventos/arquivos/checklists atribuídos | projetos não atribuídos e financeiro |
| Colaborador | registros atribuídos e atualização limitada | registros não atribuídos, relatórios administrativos e financeiro |
| Assistente | apoio em agenda, arquivos, atividades e checklists atribuídos | financeiro e administração |
| Somente leitura | leitura dos registros atribuídos | qualquer gravação |

## Casos obrigatórios

1. Usuário bloqueado não consulta dados.
2. Sessão revogada é encerrada e não autoriza novas consultas.
3. Colaborador não acessa projeto não atribuído por REST direto.
4. Financeiro não acessa registros `environment='personal'`.
5. Administrador não acessa Financeiro Pessoal sem override.
6. Override individual permite ou nega uma ação e respeita expiração.
7. Último administrador não pode ser removido.
8. Atualização de perfil exige `manage_users`.
9. Atualização de configuração exige `manage_settings`.
10. Checklist aplicado permanece igual após edição do modelo.
11. Entrada do projeto em uma etapa não duplica a mesma aplicação.
12. Tabelas de token do Drive não são consultáveis pelo cliente.
