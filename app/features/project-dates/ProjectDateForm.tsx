"use client";

import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { localDateTimeToIso } from "@/app/config/regions";
import type { DateTypeOption, ProjectActivity, ProjectDate } from "@/app/features/project-detail/types";
import type { CalendarEvent } from "@/app/domain/architecture-types";
import type { ProjectDateInput } from "./types";

function localInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Boa_Vista" }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

export function ProjectDateForm({ projectId, value, types, activities, events, pending, onSubmit, onCancel }: {
  projectId: string; value?: ProjectDate; types: DateTypeOption[]; activities: ProjectActivity[]; events: CalendarEvent[]; pending: boolean;
  onSubmit: (input: ProjectDateInput) => void; onCancel: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const starts = String(form.get("starts_at") || "");
    const ends = String(form.get("ends_at") || "");
    onSubmit({
      id: value?.id,
      project_id: projectId,
      purpose_code: String(form.get("purpose_code") || "other"),
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      starts_at: localDateTimeToIso(starts),
      ends_at: ends ? localDateTimeToIso(ends) : null,
      all_day: form.get("all_day") === "on",
      is_main_deadline: form.get("is_main_deadline") === "on",
      status: String(form.get("status") || "scheduled"),
      activity_id: String(form.get("activity_id") || "") || null,
      calendar_event_id: String(form.get("calendar_event_id") || "") || null,
    });
  }
  return (
    <form className="cs-form-grid" onSubmit={submit}>
      <label><span>Finalidade</span><select name="purpose_code" defaultValue={value?.purpose_code ?? types[0]?.code ?? "other"}>{types.map((type) => <option key={type.code} value={type.code}>{type.name}</option>)}</select></label>
      <FormField label="Título" name="title" required defaultValue={value?.title ?? ""} />
      <FormField label="Início" name="starts_at" type="datetime-local" required defaultValue={localInput(value?.starts_at) || localInput(new Date().toISOString())} />
      <FormField label="Fim" name="ends_at" type="datetime-local" defaultValue={localInput(value?.ends_at)} />
      <label><span>Situação</span><select name="status" defaultValue={value?.status ?? "scheduled"}><option value="scheduled">Planejada</option><option value="in_progress">Em andamento</option><option value="completed">Concluída</option><option value="cancelled">Cancelada</option></select></label>
      <label><span>Atividade relacionada</span><select name="activity_id" defaultValue={value?.activity_id ?? ""}><option value="">Nenhuma</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label>
      <label><span>Evento relacionado</span><select name="calendar_event_id" defaultValue={value?.calendar_event_id ?? ""}><option value="">Nenhum</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
      <label className="cs-check-option"><input type="checkbox" name="all_day" defaultChecked={value?.all_day ?? false} /><span>Dia inteiro</span></label>
      <label className="cs-check-option"><input type="checkbox" name="is_main_deadline" defaultChecked={value?.is_main_deadline ?? false} /><span>Prazo principal</span></label>
      <label className="cs-span-2"><span>Descrição</span><textarea name="description" rows={3} defaultValue={value?.description ?? ""} /></label>
      <div className="cs-form-actions"><Button type="button" onClick={onCancel}>Cancelar</Button><Button variant="primary" loading={pending}>Salvar data</Button></div>
    </form>
  );
}
