# Etapa 07 — Relações

A ficha individual consulta os registros reais de Projetos, Atividades, Agenda, Arquivos, Histórico e Financeiro profissional.

- Projetos usam `projects.client_id`.
- Atividades usam `project_activities.client_id` ou o cliente do projeto.
- Eventos podem usar `calendar_events.client_id`, projeto ou atividade.
- Arquivos usam `project_files.client_id` e podem manter outras relações.
- Financeiro considera `financial_entries.client_id` ou o cliente do projeto.

As chaves estrangeiras críticas para clientes usam `ON DELETE RESTRICT`, evitando perda silenciosa do vínculo.
