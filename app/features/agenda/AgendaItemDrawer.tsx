"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { FormField, SelectField } from "@/app/components/ui/FormField";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/app/components/a11y/FocusTrap";
import { dateTime, localDateTimeToIso } from "@/app/config/regions";
import { localInputValue } from "./agenda-date-utils";
import { AgendaEventForm } from "./AgendaEventForm";
import { archiveCalendarEvent, markAgendaItemViewed, saveCalendarEvent, setAgendaItemStatus, updateAgendaItem } from "./agenda.service";
import type { AgendaItem, AgendaOptions, CalendarEventInput } from "./types";

const sourceLabels = { event: "Evento", activity: "Atividade", project_date: "Prazo do projeto" } as const;

export function AgendaItemDrawer({
  item,
  options,
  canEdit,
  canDelete,
  onClose,
  onChanged,
}: {
  item: AgendaItem;
  options: AgendaOptions;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onChanged: (sourceType: AgendaItem["source_type"], sourceId: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useBodyScrollLock(true);
  useFocusTrap(dialogRef, onClose, !confirmDelete);
  useEffect(() => { void markAgendaItemViewed(item); }, [item]);

  async function submitGeneric(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      await updateAgendaItem({
        sourceType: item.source_type,
        sourceId: item.source_id,
        startsAt: localDateTimeToIso(String(form.get("starts_at") || "")),
        endsAt: localDateTimeToIso(String(form.get("ends_at") || "")),
        allDay: form.get("all_day") === "on",
      });
      await setAgendaItemStatus(item.source_type, item.source_id, String(form.get("status") || item.status));
      await onChanged(item.source_type, item.source_id);
      setSuccess("Agenda atualizada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao atualizar.");
    } finally { setPending(false); }
  }

  async function submitEvent(input: CalendarEventInput) {
    setPending(true); setError(""); setSuccess("");
    try {
      await saveCalendarEvent({ ...input, id: item.source_id });
      await onChanged("event", item.source_id);
      setSuccess("Evento atualizado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao atualizar o evento.");
    } finally { setPending(false); }
  }

  async function removeEvent() {
    setPending(true); setError("");
    try {
      await archiveCalendarEvent(item.source_id);
      await onChanged("event", item.source_id);
      setConfirmDelete(false);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao excluir o evento.");
    } finally { setPending(false); }
  }

  return (
    <div className="cs-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside ref={dialogRef} className="cs-agenda-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span className="cs-kicker">{sourceLabels[item.source_type]}</span><h2 id={titleId}>{item.title}</h2></div>
          <button type="button" aria-label="Fechar detalhes da agenda" onClick={onClose}>×</button>
        </header>
        <div className="cs-agenda-drawer-body">
          <div className="cs-agenda-detail-summary">
            <span className="cs-badge">{item.item_type}</span>
            <span className={`cs-badge status-${item.status}`}>{item.status}</span>
            <p>{dateTime(item.starts_at)} até {dateTime(item.ends_at)}</p>
            {item.client_name && <p>Cliente: <strong>{item.client_name}</strong></p>}
            {item.project_name && <p>Projeto: <strong>{item.project_name}</strong></p>}
            {item.responsible_name && <p>Responsável: <strong>{item.responsible_name}</strong></p>}
            {item.location && <p>Local: {item.location}</p>}
          </div>
          <FeedbackMessage error={error} success={success} />

          {item.source_type === "event" && canEdit ? (
            <AgendaEventForm
              value={item}
              options={options}
              pending={pending}
              onSubmit={(input) => void submitEvent(input)}
              onCancel={onClose}
            />
          ) : item.source_type !== "event" ? (
            <form className="cs-form-grid" onSubmit={submitGeneric}>
              <FormField label="Início" name="starts_at" type="datetime-local" required defaultValue={localInputValue(item.starts_at)} disabled={!canEdit} />
              <FormField label="Fim" name="ends_at" type="datetime-local" required defaultValue={localInputValue(item.ends_at)} disabled={!canEdit} />
              <SelectField label="Status" name="status" defaultValue={item.status} disabled={!canEdit}>
                {item.source_type === "activity" ? options.statuses.map((status) => <option key={status.code} value={status.code}>{status.name}</option>) : <><option value="scheduled">Programado</option><option value="in_progress">Em andamento</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></>}
              </SelectField>
              <label className="cs-check-option"><input type="checkbox" name="all_day" defaultChecked={item.all_day} disabled={!canEdit} /><span>Dia inteiro</span></label>
              {canEdit && <div className="cs-form-actions"><Button variant="primary" loading={pending}>Salvar alterações</Button></div>}
            </form>
          ) : null}

          <div className="cs-agenda-drawer-links">
            {item.client_id && <Link className="cs-button cs-button-secondary" href={`/clients/${item.client_id}`}>Abrir cliente</Link>}
            {item.activity_id && <Link className="cs-button cs-button-secondary" href={`/activities?activity=${item.activity_id}`}>Abrir atividade</Link>}
            {item.project_id && <Link className="cs-button cs-button-secondary" href={`/projects/${item.project_id}`}>Abrir projeto</Link>}
            {canDelete && item.source_type === "event" && <Button variant="danger" disabled={pending} onClick={() => setConfirmDelete(true)}>Excluir evento</Button>}
          </div>
        </div>
        {confirmDelete && <ConfirmDialog title="Excluir evento" message={`O evento “${item.title}” será retirado da Agenda. O registro técnico permanecerá arquivado.`} confirmLabel="Excluir evento" danger pending={pending} onClose={() => setConfirmDelete(false)} onConfirm={() => void removeEvent()} />}
      </aside>
    </div>
  );
}
