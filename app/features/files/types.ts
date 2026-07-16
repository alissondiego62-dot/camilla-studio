import type { LinkedFile, RelationOption } from "@/app/features/file-manager/types";
export type FileRow = LinkedFile & { project?: { name?: string | null } | null; client?: { name?: string | null } | null; activity?: { title?: string | null } | null; financial?: { description?: string | null } | null };
export type FileRelations = { projects: RelationOption[]; clients: RelationOption[]; activities: RelationOption[]; financial: RelationOption[] };
