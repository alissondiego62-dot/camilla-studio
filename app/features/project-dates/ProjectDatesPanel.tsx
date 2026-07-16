"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { EmptyState } from "@/app/components/ui/DataState";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { CalendarEvent } from "@/app/domain/architecture-types";
import type { DateTypeOption, ProjectActivity, ProjectDate } from "@/app/features/project-detail/types";
import type { ProjectDateInput } from "./types";
import { archiveProjectDate, completeProjectDate, createActivityFromProjectDate, createCalendarEventFromProjectDate, saveProjectDate } from "./project-dates.service";
import { ProjectDateForm } from "./ProjectDateForm";
import { ProjectDateCard } from "./ProjectDateCard";

export function ProjectDatesPanel({ projectId, dates, types, activities, events, canEdit, canCreateActivity, canCreateEvent, onChanged }: {
  projectId: string; dates: ProjectDate[]; types: DateTypeOption[]; activities: ProjectActivity[]; events: CalendarEvent[];
  canEdit: boolean; canCreateActivity: boolean; canCreateEvent: boolean; onChanged: () => Promise<void>;
}) {
  const action = useAsyncAction();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDate | undefined>();
  async function submit(input: ProjectDateInput) {
    const result = await action.run(() => saveProjectDate(input), editing ? "Data atualizada." : "Data adicionada.");
    if (result.ok) { setOpen(false); setEditing(undefined); await onChanged(); }
  }
  async function run(task: () => Promise<unknown>, message: string) {
    const result = await action.run(task, message); if (result.ok) await onChanged();
  }
  return (
    <section className="cs-project-panel">
      <div className="cs-section-heading"><div><h3>Prazos e datas planejadas</h3><p>O prazo principal aparece com destaque no Kanban.</p></div>{canEdit && <Button variant="primary" onClick={() => { setEditing(undefined); setOpen(true); }}>Nova data</Button>}</div>
      <FeedbackMessage error={action.error} success={action.success} />
      {dates.length === 0 ? <EmptyState title="Nenhuma data planejada" description="Adicione entregas, reuniões, visitas ou outros marcos do projeto." /> : <div className="cs-date-grid">{dates.map((date) => <ProjectDateCard key={date.id} value={date} types={types} canEdit={canEdit} canCreateActivity={canCreateActivity} canCreateEvent={canCreateEvent} pending={action.pending} onEdit={() => { setEditing(date); setOpen(true); }} onArchive={() => void run(() => archiveProjectDate(date.id), "Data removida.")} onComplete={(completed) => void run(() => completeProjectDate(date.id, completed), completed ? "Data concluída." : "Data reaberta.")} onCreateActivity={() => void run(() => createActivityFromProjectDate(date.id), "Atividade criada e vinculada.")} onCreateEvent={() => void run(() => createCalendarEventFromProjectDate(date.id), "Evento criado e vinculado.")} />)}</div>}
      {open && <Modal title={editing ? "Editar data" : "Nova data planejada"} onClose={() => { setOpen(false); setEditing(undefined); }}><ProjectDateForm projectId={projectId} value={editing} types={types} activities={activities} events={events} pending={action.pending} onSubmit={(input) => void submit(input)} onCancel={() => { setOpen(false); setEditing(undefined); }} /></Modal>}
    </section>
  );
}
