"use client";

import { dateTime } from "@/app/config/regions";
import { DeadlineBadge } from "@/app/components/ui/DeadlineBadge";
import { Button } from "@/app/components/ui/Button";
import type { DateTypeOption, ProjectDate } from "@/app/features/project-detail/types";

export function ProjectDateCard({ value, types, canEdit, canCreateActivity, canCreateEvent, pending, onEdit, onArchive, onComplete, onCreateActivity, onCreateEvent }: {
  value: ProjectDate; types: DateTypeOption[]; canEdit: boolean; canCreateActivity: boolean; canCreateEvent: boolean; pending: boolean;
  onEdit: () => void; onArchive: () => void; onComplete: (completed: boolean) => void; onCreateActivity: () => void; onCreateEvent: () => void;
}) {
  const type = types.find((item) => item.code === value.purpose_code)?.name ?? value.purpose_code;
  return (
    <article className={`cs-date-card ${value.is_main_deadline ? "is-main" : ""}`}>
      <header><div><span className="cs-badge">{type}</span><h4>{value.title}</h4></div>{value.is_main_deadline && <strong>Prazo principal</strong>}</header>
      <DeadlineBadge date={value.starts_at} completedAt={value.completed_at} updatedAt={value.updated_at} />
      {value.ends_at && <small>Até {dateTime(value.ends_at)}</small>}
      {value.description && <p>{value.description}</p>}
      <div className="cs-date-links">
        <span>{value.activity_id ? "✓ Atividade vinculada" : "Sem atividade"}</span>
        <span>{value.calendar_event_id ? "✓ Evento relacionado" : "Visível automaticamente na Agenda"}</span>
      </div>
      <footer className="cs-row-actions">
        {canEdit && <Button variant="text" disabled={pending} onClick={onEdit}>Editar</Button>}
        {canEdit && <Button variant="text" disabled={pending} onClick={() => onComplete(!value.completed_at)}>{value.completed_at ? "Reabrir" : "Concluir"}</Button>}
        {canCreateActivity && !value.activity_id && <Button variant="text" disabled={pending} onClick={onCreateActivity}>Criar atividade</Button>}
        {canCreateEvent && !value.calendar_event_id && <Button variant="text" disabled={pending} onClick={onCreateEvent}>Criar evento</Button>}
        {canEdit && <Button variant="danger" disabled={pending} onClick={onArchive}>Excluir</Button>}
      </footer>
    </article>
  );
}
