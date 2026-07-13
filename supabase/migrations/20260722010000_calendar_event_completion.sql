-- Fase 12: conclusão e reabertura de compromissos da agenda
alter table public.calendar_events
  add column if not exists completed_at timestamptz;

create index if not exists calendar_events_completed_at_idx
  on public.calendar_events(completed_at);

comment on column public.calendar_events.completed_at is
  'Data e hora em que o compromisso foi concluído. Nulo indica compromisso pendente.';
