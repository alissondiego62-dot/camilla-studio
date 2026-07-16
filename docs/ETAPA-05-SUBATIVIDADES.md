# Etapa 05 — Subatividades

As subatividades usam `project_activities.parent_id`, preservando a tabela e os IDs existentes.

## Proteções

- `ON DELETE SET NULL` substitui a exclusão em cascata;
- uma atividade não pode ser pai de si mesma;
- ciclos são rejeitados;
- a primeira versão admite um nível operacional de subatividade;
- pai e filho devem manter projetos e clientes compatíveis;
- posições são controladas por grupo de pai.

## Progresso

O pai exibe quantidade concluída, total e percentual. Quando possui filhos, o progresso é recalculado no banco. A configuração `activity_auto_complete_parent` permite concluir o pai quando todos os filhos forem concluídos.

A conclusão manual do pai com filhos pendentes gera alerta e exige autorização e justificativa para ser forçada.
