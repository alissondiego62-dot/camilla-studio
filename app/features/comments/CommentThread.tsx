"use client";
import { EmptyState } from "@/app/components/ui/DataState";
import { nestComments } from "./comments.service";
import { CommentItem } from "./CommentItem";
import type { MentionOption, ProjectCommentItem } from "./types";

export function CommentThread({ projectId, comments, users, canReply, canDeleteAny, canInternal, onChanged }: { projectId: string; comments: ProjectCommentItem[]; users: MentionOption[]; canReply: boolean; canDeleteAny: boolean; canInternal: boolean; onChanged: () => Promise<void> }) {
  const visible = comments.filter((item) => canInternal || item.comment_kind !== "internal_note"); const nested = nestComments(visible); const roots = nested.get(null) ?? [];
  if (!roots.length) return <EmptyState title="Nenhum comentário" description="Os comentários e observações autorizadas aparecerão aqui." />;
  return <div className="cs-comment-thread">{roots.map((item) => <CommentItem key={item.id} item={item} replies={nested.get(item.id) ?? []} projectId={projectId} users={users} canReply={canReply} canDeleteAny={canDeleteAny} canInternal={canInternal} onChanged={onChanged} />)}</div>;
}
