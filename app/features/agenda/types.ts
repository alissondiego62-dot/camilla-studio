export type CalendarRow={id:string;title:string;starts_at:string;ends_at:string|null;event_type:string;status:string;location:string|null;activity_id:string|null;project?:{name:string}|null;activity?:{title:string}|null};
export type NewCalendarEvent={title:string;starts_at:string;ends_at:string|null;event_type:string;location:string|null;activity_id?:string|null;project_id?:string|null};
export type AgendaActivityOption={id:string;title:string;project_id:string|null};
