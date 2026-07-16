"use client";

import { useEffect } from "react";
import { CommentComposer } from "@/app/features/comments/CommentComposer";
import { CommentThread } from "@/app/features/comments/CommentThread";
import { markCommentsViewed } from "@/app/features/comments/comments.service";
import type { MentionOption, ProjectCommentItem } from "@/app/features/comments/types";

export function ProjectCommentsPanel({ projectId, comments, users, canAdd, canDeleteAny, canInternal, onChanged }: { projectId: string; comments: ProjectCommentItem[]; users: MentionOption[]; canAdd: boolean; canDeleteAny: boolean; canInternal: boolean; onChanged: () => Promise<void> }) {
  useEffect(() => { void markCommentsViewed(projectId); }, [projectId]);
  return <section className="cs-project-panel"><div className="cs-section-heading"><div><h3>Comentários</h3><p>Conversas, respostas, menções e observações internas relacionadas ao projeto.</p></div></div>{canAdd && <CommentComposer projectId={projectId} users={users} canInternal={canInternal} onSaved={onChanged} />}<CommentThread projectId={projectId} comments={comments} users={users} canReply={canAdd} canDeleteAny={canDeleteAny} canInternal={canInternal} onChanged={onChanged} /></section>;
}
