export type ProjectDateInput = {
  id?: string;
  project_id: string;
  purpose_code: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  is_main_deadline: boolean;
  status: string;
  activity_id: string | null;
  calendar_event_id: string | null;
};
