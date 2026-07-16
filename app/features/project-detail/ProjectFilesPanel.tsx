"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { FormField } from "@/app/components/ui/FormField";
import { EmptyState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { dateTime } from "@/app/config/regions";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { ProjectFile } from "@/app/domain/architecture-types";
import { addProjectFile } from "./project-detail.service";

export function ProjectFilesPanel({ projectId, files, canAdd, onChanged }: { projectId: string; files: ProjectFile[]; canAdd: boolean; onChanged: () => Promise<void> }) {
  const action = useAsyncAction(); const [open, setOpen] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await action.run(() => addProjectFile(projectId, { name: String(form.get("name") || "").trim(), category: String(form.get("category") || "other"), drive_url: String(form.get("drive_url") || "").trim(), notes: String(form.get("notes") || "").trim() || null }), "Arquivo vinculado."); if (result.ok) { setOpen(false); await onChanged(); } }
  return <section className="cs-project-panel"><div className="cs-section-heading"><div><h3>Arquivos</h3><p>Links e documentos relacionados ao projeto.</p></div>{canAdd && <Button variant="primary" onClick={() => setOpen(true)}>Adicionar arquivo</Button>}</div><FeedbackMessage error={action.error} success={action.success} />{files.length === 0 ? <EmptyState title="Nenhum arquivo" description="Os arquivos autorizados aparecerão aqui." /> : <div className="cs-record-list">{files.map((item) => <article key={item.id}><div><h4>{item.name}</h4><p>{item.category} · {dateTime(item.created_at)}</p>{item.notes && <small>{item.notes}</small>}</div><a className="cs-link-button" href={item.drive_url} target="_blank" rel="noreferrer">Abrir</a></article>)}</div>}{open && <Modal title="Adicionar arquivo" onClose={() => setOpen(false)}><form className="cs-form-grid" onSubmit={submit}><FormField className="cs-span-2" label="Nome" name="name" required /><label><span>Categoria</span><select name="category" defaultValue="other"><option value="briefing">Briefing</option><option value="survey">Levantamento</option><option value="drawing">Desenho</option><option value="executive">Executivo</option><option value="render">Render</option><option value="photo">Foto</option><option value="contract">Contrato</option><option value="other">Outro</option></select></label><FormField label="Link" name="drive_url" type="url" required /><label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={3} /></label><div className="cs-form-actions"><Button type="button" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar</Button></div></form></Modal>}</section>;
}
