import { supabase } from "@/lib/supabase";
import type { CommentKind, ProjectCommentItem } from "./types";

export async function saveComment(input: { projectId: string; comment: string; parentId?: string | null; kind?: CommentKind; important?: boolean; mentions?: string[]; commentId?: string | null }) {
  const result = await supabase.rpc("save_project_comment", {
    p_project_id: input.projectId,
    p_comment: input.comment.trim(),
    p_parent_id: input.parentId ?? null,
    p_kind: input.kind ?? "comment",
    p_important: input.important ?? false,
    p_mentions: input.mentions ?? [],
    p_comment_id: input.commentId ?? null,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data as string;
}

export async function deleteComment(commentId: string) {
  const result = await supabase.rpc("delete_project_comment", { p_comment_id: commentId });
  if (result.error) throw new Error(result.error.message);
}

export async function markCommentsViewed(projectId: string) {
  const result = await supabase.rpc("mark_record_view", { p_module: "projects", p_record_type: "project", p_record_id: projectId, p_area: "comments" });
  if (result.error && !/function .* does not exist|schema cache/i.test(result.error.message)) throw new Error(result.error.message);
}

export function nestComments(items: ProjectCommentItem[]) {
  const children = new Map<string | null, ProjectCommentItem[]>();
  for (const item of items) children.set(item.parent_comment_id, [...(children.get(item.parent_comment_id) ?? []), item]);
  return children;
}
