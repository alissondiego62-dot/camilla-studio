export type CommentKind = "comment" | "internal_note";

export type CommentAuthor = { id: string; name: string | null; email: string | null };

export type ProjectCommentItem = {
  id: string;
  project_id: string;
  parent_comment_id: string | null;
  author_id: string | null;
  comment: string;
  comment_kind: CommentKind;
  important: boolean;
  edited_at: string | null;
  updated_at: string;
  deleted_at: string | null;
  created_at: string;
  author?: CommentAuthor | null;
  mentions?: Array<{ user_id: string }>;
};

export type MentionOption = { id: string; name: string; email: string };
