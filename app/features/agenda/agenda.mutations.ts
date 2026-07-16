import { assertNoError } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import type { AgendaActivityInput, AgendaSourceType, AgendaUpdateInput, CalendarEventInput } from "./types";

export async function saveCalendarEvent(input:CalendarEventInput){const result=await supabase.rpc("save_calendar_event",{p_event_id:input.id??null,p_payload:input});assertNoError(result);return String(result.data)}
export async function createActivityFromAgenda(input:AgendaActivityInput){const result=await supabase.rpc("create_activity_from_agenda",{p_payload:input});assertNoError(result);return String(result.data)}
export async function updateAgendaItem(input:AgendaUpdateInput){const result=await supabase.rpc("update_agenda_item",{p_source_type:input.sourceType,p_source_id:input.sourceId,p_starts_at:input.startsAt,p_ends_at:input.endsAt,p_all_day:input.allDay});assertNoError(result);return result.data}
export async function setAgendaItemStatus(sourceType:AgendaSourceType,sourceId:string,status:string){const result=await supabase.rpc("set_agenda_item_status",{p_source_type:sourceType,p_source_id:sourceId,p_status:status});assertNoError(result)}
export async function archiveCalendarEvent(id:string){const result=await supabase.rpc("archive_calendar_event",{p_event_id:id});assertNoError(result)}
export async function markAgendaItemViewed(item:{source_type:AgendaSourceType;source_id:string;project_id:string|null}){
 const result=await supabase.rpc("mark_agenda_item_viewed",{p_source_type:item.source_type,p_source_id:item.source_id,p_project_id:item.project_id});
 if(result.error&&!/mark_agenda_item_viewed|schema cache|does not exist/i.test(result.error.message))throw new Error(result.error.message);
}
