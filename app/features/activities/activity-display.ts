import { dateOnly, dateTime } from "@/app/config/regions";
import type { ActivityRow, ActivityStatusOption } from "./types";

export const priorityLabels: Record<string,string> = { low:"Baixa", normal:"Normal", high:"Alta", urgent:"Urgente" };
export function statusLabel(code:string,statuses:ActivityStatusOption[]){return statuses.find((item)=>item.code===code)?.name??code;}
export function activityClient(item:ActivityRow){return item.client?.name??item.project?.client?.name??"—";}
export function activityDue(item:ActivityRow){return item.due_at?dateTime(item.due_at):dateOnly(item.due_date);}
export function activityStart(item:ActivityRow){return item.starts_at?dateTime(item.starts_at):"—";}
export function activityProgress(item:ActivityRow){const total=item.children_total??item.children?.length??0;const completed=item.children_completed??item.children?.filter((child)=>child.status==="completed").length??0;return total?{value:Math.round(completed/total*100),label:`${completed} de ${total} concluídas`}:{value:item.progress,label:`${item.progress}%`};}
export function isActivityOverdue(item:ActivityRow){if(item.status==="completed"||item.status==="cancelled")return false;const raw=item.due_at??(item.due_date?`${item.due_date}T23:59:59-04:00`:null);return raw?new Date(raw).getTime()<Date.now():false;}
