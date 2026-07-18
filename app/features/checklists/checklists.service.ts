import {supabase} from "@/lib/supabase";
import type{ChecklistTemplateItem,StageChecklist}from"./types";
function fail(error:{message:string}|null){if(error)throw new Error(error.message)}
export async function listStageChecklists():Promise<StageChecklist[]>{const result=await supabase.rpc("list_stage_checklists");if(result.error)throw new Error(result.error.message);return(result.data??[])as StageChecklist[]}
export async function saveChecklistItem(row:{id?:string;template_id:string;title:string;section:string;required:boolean;position:number;active:boolean}){const result=await supabase.rpc("save_stage_checklist_item",{p_payload:{id:row.id??null,template_id:row.template_id,title:row.title.trim(),section:row.section.trim()||null,required:row.required,position:row.position,active:row.active}});fail(result.error)}
export async function archiveChecklistItem(id:string){const result=await supabase.rpc("archive_stage_checklist_item",{p_item_id:id});fail(result.error)}
export async function reorderChecklistItems(items:Array<{id:string;position:number}>){const result=await supabase.rpc("reorder_stage_checklist_items",{p_items:items});fail(result.error)}
export async function copyChecklistItem(id:string,targetStage:string){const result=await supabase.rpc("copy_stage_checklist_item",{p_item_id:id,p_target_stage_code:targetStage});fail(result.error)}
