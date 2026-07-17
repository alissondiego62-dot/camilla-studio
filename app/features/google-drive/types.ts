export type DriveConnectionStatus = {
  configured: boolean;
  connected: boolean;
  connection_id: string | null;
  google_account_email: string | null;
  root_folder_name: string;
  connection_status: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  allow_public_sharing: boolean;
};
export type DriveShare = { id:string; project_file_id:string; drive_permission_id:string; share_type:string; email_address:string|null; role:string; created_at:string; revoked_at:string|null };
export type DriveRelation = { project_id?:string|null;client_id?:string|null;activity_id?:string|null;financial_entry_id?:string|null };
