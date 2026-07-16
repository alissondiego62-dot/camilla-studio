"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { FormField } from "@/app/components/ui/FormField";
import { EmptyState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { dateTime, localDateTimeToIso } from "@/app/config/regions";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { CalendarEvent } from "@/app/domain/architecture-types";
import { addProjectEvent, updateProjectEventStatus } from "./project-detail.service";

export function ProjectAgendaPanel({ projectId, events, canCreate, canEdit, onChanged }: { projectId: string; events: CalendarEvent[]; canCreate: boolean; canEdit: boolean; onChanged: () => Promise<void> }) {
  const action = useAsyncAction(); const [open, setOpen] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const start = String(form.get("starts_at") || ""); const end = String(form.get("ends_at") || ""); const result = await action.run(() => addProjectEvent(projectId, { title: String(form.get("title") || "").trim(), event_type: String(form.get("event_type") || "meeting"), starts_at: localDateTimeToIso(start), ends_at: end ? localDateTimeToIso(end) : null, location: String(form.get("location") || "").trim() || null, notes: String(form.get("notes") || "").trim() || null }), "Compromisso adicionado."); if (result.ok) { setOpen(false); await onChanged(); } }
  async function toggle(id: string, completed: boolean) { const result = await action.run(() => updateProjectEventStatus(id, completed), completed ? "Compromisso concluído." : "Compromisso reaberto."); if (result.ok) await onChanged(); }
  return <section className="cs-project-panel"><div className="cs-section-heading"><div><h3>Agenda</h3><p>Reuniões, visitas, apresentações e entregas relacionadas.</p></div>{canCreate && <Button variant="primary" onClick={() => setOpen(true)}>Novo compromisso</Button>}</div><FeedbackMessage error={action.error} success={action.success} />{events.length === 0 ? <EmptyState title="Nenhum compromisso" description="Os eventos relacionados ao projeto aparecerão aqui." /> : <div className="cs-record-list">{events.map((item) => <article key={item.id}><div><h4>{item.title}</h4><p>{dateTime(item.starts_at)}{item.location ? ` · ${item.location}` : ""}</p><small>{item.event_type}</small></div><span className="cs-badge">{item.completed_at ? "Concluído" : "Agendado"}</span>{canEdit && <Button variant="text" onClick={() => void toggle(item.id, !item.completed_at)}>{item.completed_at ? "Reabrir" : "Concluir"}</Button>}</article>)}</div>}{open && <Modal title="Novo compromisso" onClose={() => setOpen(false)}><form className="cs-form-grid" onSubmit={submit}><FormField className="cs-span-2" label="Título" name="title" required /><label><span>Tipo</span><select name="event_type" defaultValue="meeting"><option value="meeting">Reunião</option><option value="presentation">Apresentação</option><option value="approval">Aprovação</option><option value="delivery">Entrega</option><option value="site_visit">Visita</option><option value="other">Outro</option></select></label><FormField label="Início" name="starts_at" type="datetime-local" required /><FormField label="Fim" name="ends_at" type="datetime-local" /><FormField label="Local" name="location" /><label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={3} /></label><div className="cs-form-actions"><Button type="button" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar</Button></div></form></Modal>}</section>;
}
