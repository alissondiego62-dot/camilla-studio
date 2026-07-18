"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Modal } from "@/app/components/ui/Modal";
import { FormField, SelectField } from "@/app/components/ui/FormField";
import { EmptyState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { dateTime, localDateTimeToIso } from "@/app/config/regions";
import { localInputValue } from "@/app/features/agenda/agenda-date-utils";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { CalendarEvent } from "@/app/domain/architecture-types";
import type { ProjectOption } from "./types";
import { addProjectEvent, deleteProjectEvent, updateProjectEvent, updateProjectEventStatus } from "./project-detail.service";

const eventTypes = [
  ["meeting", "Reunião"],
  ["presentation", "Apresentação"],
  ["approval", "Aprovação"],
  ["delivery", "Entrega"],
  ["site_visit", "Visita"],
  ["other", "Outro"],
] as const;

const eventStatuses = [
  ["scheduled", "Agendado"],
  ["in_progress", "Em andamento"],
  ["completed", "Concluído"],
  ["cancelled", "Cancelado"],
] as const;

function statusLabel(event: CalendarEvent) {
  if (event.completed_at) return "Concluído";
  return eventStatuses.find(([value]) => value === event.status)?.[1] ?? "Agendado";
}

export function ProjectAgendaPanel({
  projectId,
  events,
  users,
  clientId,
  canCreate,
  canEdit,
  canDelete,
  onChanged,
}: {
  projectId: string;
  events: CalendarEvent[];
  users: ProjectOption[];
  clientId: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => Promise<void>;
}) {
  const action = useAsyncAction();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);

  function readEventForm(form: FormData) {
    const start = String(form.get("starts_at") || "");
    const end = String(form.get("ends_at") || "");
    return {
      title: String(form.get("title") || "").trim(),
      event_type: String(form.get("event_type") || "meeting"),
      starts_at: localDateTimeToIso(start),
      ends_at: end ? localDateTimeToIso(end) : null,
      all_day: form.get("all_day") === "on",
      status: String(form.get("status") || "scheduled"),
      responsible_user_id: String(form.get("responsible_user_id") || "") || null,
      location: String(form.get("location") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    };
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await action.run(() => addProjectEvent(projectId, clientId, readEventForm(new FormData(event.currentTarget))), "Compromisso adicionado.");
    if (result.ok) { setCreateOpen(false); await onChanged(); }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const result = await action.run(() => updateProjectEvent(editing.id, projectId, editing.client_id ?? clientId, readEventForm(new FormData(event.currentTarget))), "Compromisso atualizado.");
    if (result.ok) { setEditing(null); await onChanged(); }
  }

  async function toggle(id: string, completed: boolean) {
    const result = await action.run(() => updateProjectEventStatus(id, completed), completed ? "Compromisso concluído." : "Compromisso reaberto.");
    if (result.ok) await onChanged();
  }

  async function remove() {
    if (!deleting) return;
    const result = await action.run(() => deleteProjectEvent(deleting.id), "Compromisso excluído.");
    if (result.ok) { setDeleting(null); await onChanged(); }
  }

  const form = (value: CalendarEvent | null, submit: (event: FormEvent<HTMLFormElement>) => void, cancel: () => void) => (
    <form className="cs-form-grid" onSubmit={submit}>
      <FormField className="cs-span-2" label="Título" name="title" defaultValue={value?.title ?? ""} required />
      <SelectField label="Tipo" name="event_type" defaultValue={value?.event_type ?? "meeting"}>{eventTypes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</SelectField>
      <SelectField label="Status" name="status" defaultValue={value?.status ?? (value?.completed_at ? "completed" : "scheduled")}>{eventStatuses.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</SelectField>
      <FormField label="Início" name="starts_at" type="datetime-local" defaultValue={localInputValue(value?.starts_at)} required />
      <FormField label="Fim" name="ends_at" type="datetime-local" defaultValue={localInputValue(value?.ends_at)} />
      <label><span>Responsável</span><select name="responsible_user_id" defaultValue={value?.responsible_user_id ?? ""}><option value="">Não definido</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <FormField label="Local" name="location" defaultValue={value?.location ?? ""} />
      <label className="cs-check-option"><input type="checkbox" name="all_day" defaultChecked={value?.all_day ?? false} /><span>Dia inteiro</span></label>
      <label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={4} defaultValue={value?.notes ?? ""} /></label>
      <div className="cs-form-actions"><Button type="button" onClick={cancel}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar</Button></div>
    </form>
  );

  return (
    <section className="cs-project-panel">
      <div className="cs-section-heading">
        <div><h3>Agenda</h3><p>Reuniões, visitas, apresentações e entregas relacionadas.</p></div>
        {canCreate && <Button variant="primary" onClick={() => setCreateOpen(true)}>Novo compromisso</Button>}
      </div>
      <FeedbackMessage error={action.error} success={action.success} />
      {events.length === 0 ? <EmptyState title="Nenhum compromisso" description="Os eventos relacionados ao projeto aparecerão aqui." /> : (
        <div className="cs-record-list">
          {events.map((item) => (
            <article key={item.id}>
              <div className="cs-record-main"><h4>{item.title}</h4><p>{dateTime(item.starts_at)}{item.location ? ` · ${item.location}` : ""}</p><small>{eventTypes.find(([value]) => value === item.event_type)?.[1] ?? item.event_type}</small></div>
              <span className="cs-badge">{statusLabel(item)}</span>
              <div className="cs-record-actions">
                {canEdit && <Button variant="text" onClick={() => setEditing(item)}>Editar</Button>}
                {canEdit && <Button variant="text" onClick={() => void toggle(item.id, !item.completed_at)}>{item.completed_at ? "Reabrir" : "Concluir"}</Button>}
                {canDelete && <Button variant="danger" onClick={() => setDeleting(item)}>Excluir</Button>}
              </div>
            </article>
          ))}
        </div>
      )}
      {createOpen && <Modal title="Novo compromisso" onClose={() => setCreateOpen(false)}>{form(null, submitCreate, () => setCreateOpen(false))}</Modal>}
      {editing && <Modal title="Editar compromisso" onClose={() => setEditing(null)}>{form(editing, submitEdit, () => setEditing(null))}</Modal>}
      {deleting && <ConfirmDialog title="Excluir compromisso" message={`O compromisso “${deleting.title}” será retirado da Agenda e do projeto. O registro técnico será preservado.`} confirmLabel="Excluir compromisso" danger pending={action.pending} onClose={() => setDeleting(null)} onConfirm={() => void remove()} />}
    </section>
  );
}
