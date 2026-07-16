# Etapa 05 — Estrutura das atividades

A tabela `project_activities` continua sendo a fonte única dos registros. A migration acrescenta relações, período, documento de observações, auditoria de edição e exclusão lógica sem alterar os UUIDs existentes.

## Campos principais

- título, descrição e observações estruturadas;
- status e prioridade;
- responsável e participantes;
- data/hora inicial e prazo final;
- opção de dia inteiro;
- projeto, cliente e etapa;
- tags e percentual;
- criador, última edição e último editor;
- arquivamento e exclusão lógica.

`due_date` é mantido para compatibilidade e sincronizado com `due_at` quando aplicável.

## Atualização localizada

A interface mantém estado normalizado por ID. Gravações bem-sucedidas atualizam apenas a atividade afetada e, quando necessário, sua atividade principal. Comentários e anexos não são recarregados junto com a lista.
