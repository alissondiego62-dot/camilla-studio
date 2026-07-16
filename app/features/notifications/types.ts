export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type StudioNotification = {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  type_code: string;
  module: string;
  record_type: string | null;
  record_id: string | null;
  project_id: string | null;
  title: string;
  body: string | null;
  priority: NotificationPriority;
  link: string | null;
  read_at: string | null;
  archived_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type NotificationPreference = {
  user_id: string;
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  event_reminder_enabled: boolean;
  reminder_minutes: number;
  timezone: string;
};

export type NotificationTypeRule = {
  type_code: string;
  label: string;
  module: string;
  enabled: boolean;
  in_app: boolean;
  push: boolean;
  lead_minutes: number | null;
};

export type NotificationProfile = { id: string; code: string; name: string };
export type NotificationProfileRule = { permission_profile_id: string; type_code: string; enabled: boolean; in_app: boolean; push: boolean; lead_minutes: number | null };
export type NotificationCatalogItem = { type_code: string; label: string; module: string; default_enabled: boolean; default_in_app: boolean; default_push: boolean; default_lead_minutes: number | null };
