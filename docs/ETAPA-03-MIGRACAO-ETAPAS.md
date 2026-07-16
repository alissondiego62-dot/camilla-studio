# Etapa 03 — Migração de etapas

## Estudo Preliminar

O código interno `briefing_preliminary` foi preservado para não quebrar IDs, filtros, checklists, histórico ou registros existentes. O nome oficial passou a ser **Estudo Preliminar** em:

- catálogo `project_stages`;
- Kanban;
- formulários de projeto;
- filtros e seletores;
- checklists e respectivos itens;
- indicadores e histórico exibido.

Descrições históricas que continham “Briefing Preliminar” ou “Briefing e preliminares” recebem o texto oficial. O texto anterior é preservado em `project_history.metadata.stage03_original_description`.

## Retirada de Obra

O código `construction` deixa de ser uma etapa operacional. Ele permanece reconhecido apenas para leitura de histórico e reversão.

Regra de migração:

| Situação anterior | Nova etapa |
|---|---|
| Projeto em Obra com status `completed` | Finalizado (`completed`) |
| Projeto em Obra com qualquer outro status | Revisão (`revision`) |

Antes da atualização é criado um registro `stage_migrated` em `project_history`, com etapa e status originais no campo `metadata`.

A auditoria de leitura realizada em 16/07/2026 encontrou **17 projetos** e **nenhum projeto em Obra**. A regra continua no SQL para proteger outras instalações, importações ou alterações ocorridas antes da aplicação.

Modelos de checklist vinculados a `construction` são arquivados. Checklists já aplicados e históricos não são apagados.
