"use client";
import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { dateTime } from "@/app/config/regions";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { useAuth } from "@/app/providers/AuthProvider";
import { deleteComment, saveComment } from "./comments.service";
import { CommentComposer } from "./CommentComposer";
import type { MentionOption, ProjectCommentItem } from "./types";

export function CommentItem({ item, replies, projectId, users, canReply, canDeleteAny, canInternal, onChanged }: { item: ProjectCommentItem; replies: ProjectCommentItem[]; projectId: string; users: MentionOption[]; canReply: boolean; canDeleteAny: boolean; canInternal: boolean; onChanged: () => Promise<void> }) {
  const { user } = useAuth(); const action = useAsyncAction(); const [replying, setReplying] = useState(false); const [editing, setEditing] = useState(false); const own = item.author_id === user?.id;
  async function edit() { const textarea = document.getElementById(`edit-comment-${item.id}`) as HTMLTextAreaElement | null; if (!textarea?.value.trim()) return; const result = await action.run(() => saveComment({ projectId, commentId: item.id, comment: textarea.value, kind: item.comment_kind, important: item.important }), "Comentário atualizado."); if (result.ok) { setEditing(false); await onChanged(); } }
  async function remove() { if (!confirm("Arquivar este comentário?")) return; const result = await action.run(() => deleteComment(item.id), "Comentário arquivado."); if (result.ok) await onChanged(); }
  return <article className={`cs-comment-item ${item.comment_kind === "internal_note" ? "is-internal" : ""} ${item.important ? "is-important" : ""}`}>
    <header><div><strong>{item.author?.name || item.author?.email || "Usuário"}</strong>{item.comment_kind === "internal_note" && <span className="cs-badge">Observação interna</span>}{item.important && <span className="cs-badge">Importante</span>}</div><time>{dateTime(item.created_at)}{item.edited_at ? " · editado" : ""}</time></header>
    {editing ? <div className="cs-comment-edit"><textarea id={`edit-comment-${item.id}`} defaultValue={item.comment} rows={3} /><div><Button onClick={() => setEditing(false)}>Cancelar</Button><Button variant="primary" loading={action.pending} onClick={() => void edit()}>Salvar</Button></div></div> : <p>{item.deleted_at ? "Comentário removido." : item.comment}</p>}
    {!item.deleted_at && <footer>{canReply && <Button variant="text" onClick={() => setReplying((value) => !value)}>Responder</Button>}{own && <Button variant="text" onClick={() => setEditing(true)}>Editar</Button>}{(own || canDeleteAny) && <Button variant="text" onClick={() => void remove()}>Excluir</Button>}</footer>}
    {replying && <CommentComposer projectId={projectId} users={users} parentId={item.id} canInternal={canInternal} onSaved={onChanged} onCancel={() => setReplying(false)} />}
    {replies.length > 0 && <div className="cs-comment-replies">{replies.map((child) => <CommentItem key={child.id} item={child} replies={[]} projectId={projectId} users={users} canReply={false} canDeleteAny={canDeleteAny} canInternal={canInternal} onChanged={onChanged} />)}</div>}
  </article>;
}
