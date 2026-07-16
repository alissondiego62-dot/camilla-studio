# Etapa 04 — Modelo do histórico central

## Tabela `history_entries`

Registra:

- módulo;
- tipo e ID do registro;
- projeto relacionado;
- autor;
- ação;
- campo alterado;
- valor anterior;
- valor novo;
- descrição legível;
- metadados;
- tabela e ID de origem;
- data e horário.

## Compatibilidade

Os registros de `project_history` são preservados e copiados para o histórico central com `source_table = 'project_history'`. O índice de origem impede duplicação. O histórico específico do projeto continua disponível para compatibilidade.

## Cobertura

- Projetos, etapas, status, responsáveis e prazos.
- Clientes.
- Atividades e subatividades.
- Agenda.
- Financeiro, respeitando o ambiente pessoal ou profissional.
- Arquivos e versões.
- Comentários e observações internas.
- Usuários, permissões e configurações.

## Segurança

Usuários comuns recebem somente `SELECT`. Não há concessão de `UPDATE` ou `DELETE`. A função `can_access_history_entry` valida o módulo antes do projeto para impedir vazamento de dados financeiros ou observações internas.
