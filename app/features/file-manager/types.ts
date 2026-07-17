export type FileOrigin = "supabase_storage" | "google_drive" | "external_link";
export type FileRelationType = "project" | "client" | "activity" | "financial";
export type LinkedFile = {
  id:string;project_id:string|null;client_id:string|null;activity_id:string|null;financial_entry_id:string|null;
  name:string;category:string;drive_url:string|null;drive_file_id:string|null;drive_folder_id?:string|null;drive_parent_folder_id?:string|null;
  drive_connection_id?:string|null;drive_web_view_link?:string|null;drive_web_content_link?:string|null;drive_revision_id?:string|null;drive_checksum?:string|null;
  drive_last_synced_at?:string|null;drive_sync_error?:string|null;drive_uploaded_at?:string|null;drive_modified_at?:string|null;
  mime_type:string|null;file_size:number|null;origin:FileOrigin;storage_bucket:string|null;storage_path:string|null;version:number;version_group_id:string;
  replaces_file_id:string|null;notes:string|null;download_allowed:boolean;archived_at:string|null;created_by:string|null;created_at:string;updated_at:string;
  author?:{name?:string|null;email?:string|null}|null;
};
export type RelationOption={id:string;label:string};
