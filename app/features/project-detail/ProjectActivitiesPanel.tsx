"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Modal } from "@/app/components/ui/Modal";
import { FormField, SelectField } from "@/app/components/ui/FormField";
import { EmptyState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { dateOnly, dateTime, localDateTimeToIso } from "@/app/config/regions";
import { localInputValue } from "@/app/features/agenda/agenda-date-utils";
import { deleteActivityLogically, updateActivity } from "@/app/features/activities/activities.service";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { ProjectActivity, ProjectOption } from "./types";
import { addProjectActivity, updateProjectActivityStatus } from "./project-detail.service";

const statusOptions = [
  ["not_started", "Não iniciada"],
  ["in_progress", "Em andamento"],
  ["waiting", "Aguardando"],
  ["blocked", "Bloqueada"],
  ["completed", "Concluída"],
  ["cancelled", "Cancelada"],
] as const;

const priorityOptions = [
  ["low", "Baixa"],
  ["normal", "Normal"],
  ["high", "Alta"],
  ["urgent", "Urgente"],
] as const;

function statusLabel(code: string) {
  return statusOptions.find(([value]) => value === code)?.[1] ?? code;
}

export function ProjectActivitiesPanel({
  projectId,
  activities,
  users,
  canCreate,
  canEdit,
  canDelete,
  onChanged,
}: {
  projectId: string;
  activities: ProjectActivity[];
  users: ProjectOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => Promise<void>;
}) {
  const action = useAsyncAction();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectActivity | null>(null);
  const [deleting, setDeleting] = useState<ProjectActivity | null>(null);
  const main = activities.filter((item) => !item.parent_id);
  const childCount = new Map<string, number>();
  for (const item of activities) if (item.parent_id) childCount.set(item.parent_id, (childCount.get(item.parent_id) ?? 0) + 1);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = String(form.get("responsible_user_id") || "") || null;
    const user = users.find((item) => item.id === userId);
    const dueInput = String(form.get("due_at") || "");
    const result = await action.run(() => addProjectActivity(projectId, {
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      due_date: dueInput ? dueInput.slice(0, 10) : null,
      due_at: dueInput ? localDateTimeToIso(dueInput) : null,
      responsible_user_id: userId,
      responsible_name: user?.name ?? null,
    }), "Atividade criada.");
    if (result.ok) { setCreateOpen(false); await onChanged(); }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const userId = String(form.get("responsible_user_id") || "") || null;
    const user = users.find((item) => item.id === userId);
    const dueInput = String(form.get("due_at") || "");
    const result = await action.run(() => updateActivity(editing.id, {
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      status: String(form.get("status") || editing.status),
      priority: String(form.get("priority") || editing.priority),
      responsible_user_id: userId,
      responsible_name: user?.name ?? null,
      due_date: dueInput ? dueInput.slice(0, 10) : null,
      due_at: dueInput ? localDateTimeToIso(dueInput) : null,
    }), "Atividade atualizada.");
    if (result.ok) { setEditing(null); await onChanged(); }
  }

  async function toggle(id: string, completed: boolean) {
    const result = await action.run(() => updateProjectActivityStatus(id, completed), completed ? "Atividade concluída." : "Atividade reaberta.");
    if (result.ok) await onChanged();
  }

  async function remove() {
    if (!deleting) return;
    const result = await action.run(() => deleteActivityLogically(deleting.id), "Atividade excluída.");
    if (result.ok) { setDeleting(null); await onChanged(); }
  }

  return (
    <section className="cs-project-panel">
      <div className="cs-section-heading">
        <div><h3>Atividades</h3><p>Atividades e subatividades vinculadas ao projeto.</p></div>
        <div className="cs-inline-actions">
          <Link className="cs-button" href={`/activities?project=${projectId}`}>Abrir workspace</Link>
          {canCreate && <Button variant="primary" onClick={() => setCreateOpen(true)}>Nova atividade</Button>}
        </div>
      </div>
      <FeedbackMessage error={action.error} success={action.success} />
      {main.length === 0 ? <EmptyState title="Nenhuma atividade" description="As atividades vinculadas aparecerão aqui." /> : (
        <div className="cs-record-list">
          {main.map((item) => (
            <article key={item.id}>
              <div className="cs-record-main">
                <Link href={`/activities?activity=${item.id}`}><h4>{item.title}</h4></Link>
                <p>{item.description || "Sem descrição"}</p>
                <small>{item.responsible_name || "Sem responsável"} · {item.due_at ? dateTime(item.due_at) : dateOnly(item.due_date)} · {childCount.get(item.id) ?? 0} subatividade(s) · {item.progress}%</small>
              </div>
              <span className="cs-badge">{item.completed_at ? "Concluída" : statusLabel(item.status)}</span>
              <div className="cs-record-actions">
                {canEdit && <Button variant="text" onClick={() => setEditing(item)}>Editar</Button>}
                {canEdit && <Button variant="text" onClick={() => void toggle(item.id, !item.completed_at)}>{item.completed_at ? "Reabrir" : "Concluir"}</Button>}
                {canDelete && <Button variant="danger" onClick={() => setDeleting(item)}>Excluir</Button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {createOpen && (
        <Modal title="Nova atividade" onClose={() => setCreateOpen(false)}>
          <form className="cs-form-grid" onSubmit={submitCreate}>
            <FormField className="cs-span-2" label="Título" name="title" required />
            <FormField label="Prazo" name="due_at" type="datetime-local" />
            <label><span>Responsável</span><select name="responsible_user_id" defaultValue=""><option value="">Não atribuído</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label className="cs-span-2"><span>Descrição</span><textarea name="description" rows={3} /></label>
            <div className="cs-form-actions"><Button type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar</Button></div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Editar atividade" onClose={() => setEditing(null)}>
          <form className="cs-form-grid" onSubmit={submitEdit}>
            <FormField className="cs-span-2" label="Título" name="title" defaultValue={editing.title} required />
            <SelectField label="Status" name="status" defaultValue={editing.status}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
            <SelectField label="Prioridade" name="priority" defaultValue={editing.priority}>{priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
            <FormField label="Prazo" name="due_at" type="datetime-local" defaultValue={localInputValue(editing.due_at ?? (editing.due_date ? `${editing.due_date}T17:00:00-04:00` : null))} />
            <label><span>Responsável</span><select name="responsible_user_id" defaultValue={editing.responsible_user_id ?? ""}><option value="">Não atribuído</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label className="cs-span-2"><span>Descrição</span><textarea name="description" rows={4} defaultValue={editing.description ?? ""} /></label>
            <div className="cs-form-actions"><Button type="button" onClick={() => setEditing(null)}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar alterações</Button></div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir atividade"
          message={`A atividade “${deleting.title}” será excluída das telas do projeto e do workspace. O histórico técnico será preservado.`}
          confirmLabel="Excluir atividade"
          danger
          pending={action.pending}
          onClose={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  );
}
