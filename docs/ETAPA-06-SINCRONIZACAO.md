# Etapa 06 — Sincronização bidirecional

## Origem real

| Item visual | Registro alterado |
|---|---|
| Evento manual | `calendar_events` |
| Atividade ou subatividade | `project_activities` |
| Prazo planejado | `project_dates` |

A RPC `update_agenda_item` recebe a origem e o UUID. Ela valida o intervalo, verifica permissão e atualiza apenas a tabela correspondente.

## Atividades

- Sem data: não aparecem.
- Apenas prazo: aparecem como item pontual.
- Início e fim: ocupam o intervalo.
- Dia inteiro: aparecem na faixa superior.
- Canceladas: ocultas por padrão.
- Arquivadas ou excluídas logicamente: não aparecem.

`due_date` permanece sincronizado com `due_at` para compatibilidade.

## Prazos

Quando um prazo principal é movido, `projects.main_deadline` é recalculado no fuso `America/Boa_Vista`.

## Prevenção de duplicidade

Um `project_date` com `activity_id` ou `calendar_event_id` não é retornado pela view. A fonte convertida passa a representar o item na Agenda.
