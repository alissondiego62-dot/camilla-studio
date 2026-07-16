"use client";

import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { dateTime } from "@/app/config/regions";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { ProjectComment } from "@/app/domain/architecture-types";
import { addProjectComment } from "./project-detail.service";

export function ProjectCommentsPanel({ projectId, comments, canAdd, onChanged }: { projectId: string; comments: ProjectComment[]; canAdd: boolean; onChanged: () => Promise<void> }) {
  const action = useAsyncAction();
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const comment = String(form.get("comment") || "").trim(); if (!comment) return; const result = await action.run(() => addProjectComment(projectId, comment), "Comentário adicionado."); if (result.ok) { formElement.reset(); await onChanged(); } }
  return <section className="cs-project-panel"><div className="cs-section-heading"><div><h3>Comentários</h3><p>Registros de comunicação relacionados ao projeto.</p></div></div><FeedbackMessage error={action.error} success={action.success} />{canAdd && <form className="cs-comment-form" onSubmit={submit}><textarea name="comment" rows={3} required placeholder="Escreva um comentário…" /><Button variant="primary" loading={action.pending}>Adicionar comentário</Button></form>}{comments.length === 0 ? <EmptyState title="Nenhum comentário" description="Os comentários relacionados aparecerão aqui." /> : <div className="cs-comment-list">{comments.map((item) => <article key={item.id}><p>{item.comment}</p><small>{dateTime(item.created_at)}</small></article>)}</div>}</section>;
}
