# Etapa 06 — Modelo da Agenda

## Fontes

A Agenda utiliza a view `public.agenda_items`, com `security_invoker=true`, para reunir:

- `calendar_events`: reuniões, visitas, apresentações e eventos pessoais;
- `project_activities`: atividades e subatividades com `starts_at` ou `due_at`;
- `project_dates`: prazos planejados sem atividade ou evento já convertido.

A chave lógica é `source_type:source_id`. Nenhum registro é copiado para outra tabela apenas para aparecer no calendário.

## Visualizações

- **Dia:** grade de 24 horas, faixa de dia inteiro e indicador de horário atual.
- **Semana:** sete colunas, faixa de dia inteiro, arraste entre dias e horários.
- **Mês:** grade mensal, itens compactos, excedentes e arraste entre datas.

## Estado

O cliente mantém itens normalizados por `item_key`. Alterações otimistas atualizam somente o item afetado e voltam ao valor anterior quando a RPC falha.
