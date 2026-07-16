"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { MentionPicker } from "./MentionPicker";
import { saveComment } from "./comments.service";
import type { CommentKind, MentionOption } from "./types";

export function CommentComposer({ projectId, users, parentId = null, canInternal = false, onSaved, onCancel }: { projectId: string; users: MentionOption[]; parentId?: string | null; canInternal?: boolean; onSaved: () => Promise<void>; onCancel?: () => void }) {
  const action = useAsyncAction(); const [mentions, setMentions] = useState<string[]>([]); const [kind, setKind] = useState<CommentKind>("comment"); const [important, setImportant] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const result = await action.run(() => saveComment({ projectId, comment: String(data.get("comment") || ""), parentId, kind, important, mentions }), parentId ? "Resposta adicionada." : "Comentário adicionado."); if (result.ok) { form.reset(); setMentions([]); setImportant(false); await onSaved(); onCancel?.(); } }
  return <form className="cs-comment-composer" onSubmit={submit}><FeedbackMessage error={action.error} success={action.success} /><textarea name="comment" rows={parentId ? 2 : 4} required maxLength={5000} placeholder={parentId ? "Escreva uma resposta…" : "Escreva um comentário…"} />{!parentId && <div className="cs-comment-options">{canInternal && <label><span>Tipo</span><select value={kind} onChange={(e) => setKind(e.target.value as CommentKind)}><option value="comment">Comentário</option><option value="internal_note">Observação interna</option></select></label>}<MentionPicker users={users} value={mentions} onChange={setMentions} /><label className="cs-check-option"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} /> Marcar como importante</label></div>}<div className="cs-form-actions">{onCancel && <Button type="button" onClick={onCancel}>Cancelar</Button>}<Button variant="primary" loading={action.pending}>{parentId ? "Responder" : "Publicar"}</Button></div></form>;
}
