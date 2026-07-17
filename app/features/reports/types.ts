export type ReportCode =
  | "projects_by_stage" | "projects_by_status" | "projects_by_responsible" | "projects_overdue" | "projects_upcoming"
  | "activities_by_status" | "activities_by_responsible" | "activities_overdue" | "checklists"
  | "clients" | "history" | "agenda" | "productivity" | "receivables" | "payables";
export type ReportFilter = { start_date: string; end_date: string; project_id: string; client_id: string; responsible_user_id: string; stage: string; status: string; module: string; author_user_id: string };
export type ReportColumn = { key: string; label: string; format?: "date" | "datetime" | "money" | "number" | "percent" };
export type ReportDefinition = { code: ReportCode; title: string; description: string; group: string; financial?: boolean; columns: ReportColumn[] };
export type ReportResult = { code: ReportCode; title: string; total: number; rows: Array<Record<string, unknown>>; summary: Record<string, unknown>; chart: Array<{ label: string; value: number; color?: string | null }> };
export type ReportOptions = { projects: Array<{id:string;label:string}>; clients:Array<{id:string;label:string}>; responsible:Array<{id:string;label:string}>; stages:Array<{id:string;label:string}>; statuses:Array<{id:string;label:string}>; modules:Array<{id:string;label:string}> };
