"use client";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { FormField } from "@/app/components/ui/FormField";
import { EmptyState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { dateOnly, dateTime } from "@/app/config/regions";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { ProjectActivity, ProjectOption } from "./types";
import { addProjectActivity, updateProjectActivityStatus } from "./project-detail.service";

export function ProjectActivitiesPanel({ projectId, activities, users, canCreate, canEdit, onChanged }: { projectId: string; activities: ProjectActivity[]; users: ProjectOption[]; canCreate: boolean; canEdit: boolean; onChanged: () => Promise<void> }) {
  const action = useAsyncAction(); const [open, setOpen] = useState(false);
  const main = activities.filter((item) => !item.parent_id); const childCount = new Map<string,number>();
  for (const item of activities) if (item.parent_id) childCount.set(item.parent_id,(childCount.get(item.parent_id)??0)+1);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const userId = String(form.get("responsible_user_id") || "") || null; const user = users.find((item) => item.id === userId); const result = await action.run(() => addProjectActivity(projectId, { title: String(form.get("title") || "").trim(), description: String(form.get("description") || "").trim() || null, due_date: String(form.get("due_date") || "") || null, responsible_user_id: userId, responsible_name: user?.name ?? null }), "Atividade criada."); if (result.ok) { setOpen(false); await onChanged(); } }
  async function toggle(id: string, completed: boolean) { const result = await action.run(() => updateProjectActivityStatus(id, completed), completed ? "Atividade concluída." : "Atividade reaberta."); if (result.ok) await onChanged(); }
  return <section className="cs-project-panel"><div className="cs-section-heading"><div><h3>Atividades</h3><p>Atividades e subatividades vinculadas ao projeto.</p></div><div className="cs-inline-actions"><Link className="cs-button" href={`/activities?project=${projectId}`}>Abrir workspace</Link>{canCreate && <Button variant="primary" onClick={() => setOpen(true)}>Nova atividade</Button>}</div></div><FeedbackMessage error={action.error} success={action.success} />{main.length === 0 ? <EmptyState title="Nenhuma atividade" description="As atividades vinculadas aparecerão aqui." /> : <div className="cs-record-list">{main.map((item) => <article key={item.id}><div><Link href={`/activities?activity=${item.id}`}><h4>{item.title}</h4></Link><p>{item.description || "Sem descrição"}</p><small>{item.responsible_name || "Sem responsável"} · {item.due_at ? dateTime(item.due_at) : dateOnly(item.due_date)} · {childCount.get(item.id)??0} subatividade(s) · {item.progress}%</small></div><span className="cs-badge">{item.completed_at ? "Concluída" : item.status}</span>{canEdit && <Button variant="text" onClick={() => void toggle(item.id, !item.completed_at)}>{item.completed_at ? "Reabrir" : "Concluir"}</Button>}</article>)}</div>}{open && <Modal title="Nova atividade" onClose={() => setOpen(false)}><form className="cs-form-grid" onSubmit={submit}><FormField className="cs-span-2" label="Título" name="title" required /><FormField label="Prazo" name="due_date" type="date" /><label><span>Responsável</span><select name="responsible_user_id" defaultValue=""><option value="">Não atribuído</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="cs-span-2"><span>Descrição</span><textarea name="description" rows={3} /></label><div className="cs-form-actions"><Button type="button" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar</Button></div></form></Modal>}</section>;
}
