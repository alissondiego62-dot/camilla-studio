"use client";
import { useCallback, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { Modal } from "@/app/components/ui/Modal";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { getAgendaItem, createActivityFromAgenda, saveCalendarEvent } from "./agenda.service";
import { formatLongDay, minutesOfDay, toIso } from "./agenda-date-utils";
import { useAgendaWorkspace } from "./useAgendaWorkspace";
import { useAgendaDragResize } from "./useAgendaDragResize";
import { AgendaToolbar } from "./AgendaToolbar";
import { AgendaCreateMenu } from "./AgendaCreateMenu";
import { AgendaEventForm } from "./AgendaEventForm";
import { AgendaActivityForm } from "./AgendaActivityForm";
import { AgendaItemDrawer } from "./AgendaItemDrawer";
import { AgendaDayView } from "./views/AgendaDayView";
import { AgendaWeekView } from "./views/AgendaWeekView";
import { AgendaMonthView } from "./views/AgendaMonthView";
import type { AgendaItem, AgendaSourceType } from "./types";

type Draft={day:string;minutes:number;allDay:boolean};
export function AgendaWorkspace(){
 const workspace=useAgendaWorkspace();const[selected,setSelected]=useState<AgendaItem|null>(null);const[draft,setDraft]=useState<Draft|null>(null);const[creation,setCreation]=useState<"menu"|"event"|"activity"|null>(null);const[pending,setPending]=useState(false);const[actionError,setActionError]=useState("");
 const canCreate=workspace.permissions.can("agenda","create")||workspace.permissions.can("activities","create");const canEdit=workspace.permissions.can("agenda","edit")||workspace.permissions.can("activities","edit")||workspace.permissions.can("projects","change_deadline");
 const byKey=useMemo(()=>new Map(workspace.items.map(item=>[item.item_key,item])),[workspace.items]);
 const openCreate=useCallback((day:string,minutes=9*60,allDay=false)=>{setActionError("");setDraft({day,minutes,allDay});setCreation("menu")},[]);
 const defaults=useMemo(()=>{if(!draft)return null;const startsAt=toIso(draft.day,draft.allDay?0:draft.minutes);const endsAt=new Date(new Date(startsAt).getTime()+(draft.allDay?24*60:60)*60000).toISOString();return{startsAt,endsAt,allDay:draft.allDay}},[draft]);
 async function changed(sourceType:AgendaSourceType,sourceId:string){const fresh=await getAgendaItem(sourceType,sourceId);if(fresh){workspace.upsert(fresh);setSelected(fresh)}else{workspace.remove(`${sourceType}:${sourceId}`);setSelected(null)}}
 async function drop(key:string,day:string,minutes:number,allDay:boolean){const item=byKey.get(key);if(!item||!item.editable)return;setActionError("");try{await workspace.move(item,day,minutes,allDay)}catch(reason){setActionError(reason instanceof Error?reason.message:"Não foi possível mover o item.")}}
 const resize=useCallback(async(item:AgendaItem,endsAt:string)=>{setActionError("");try{await workspace.resize(item,endsAt)}catch(reason){setActionError(reason instanceof Error?reason.message:"Não foi possível alterar a duração.")}},[workspace]);
 const{beginResize}=useAgendaDragResize({snapMinutes:workspace.options.snapMinutes,onResize:resize});
 async function createEvent(input:Parameters<typeof saveCalendarEvent>[0]){setPending(true);setActionError("");try{const id=await saveCalendarEvent(input);setCreation(null);setDraft(null);const fresh=await getAgendaItem("event",id);if(fresh)workspace.upsert(fresh)}catch(reason){setActionError(reason instanceof Error?reason.message:"Erro ao salvar evento.")}finally{setPending(false)}}
 async function createActivity(input:Parameters<typeof createActivityFromAgenda>[0]){setPending(true);setActionError("");try{const id=await createActivityFromAgenda(input);setCreation(null);setDraft(null);const fresh=await getAgendaItem("activity",id);if(fresh)workspace.upsert(fresh)}catch(reason){setActionError(reason instanceof Error?reason.message:"Erro ao criar atividade.")}finally{setPending(false)}}
 if(workspace.loading)return <LoadingState/>;
 if(workspace.error)return <ErrorState message={workspace.error} onRetry={()=>void workspace.reload()}/>;
 const common={items:workspace.items,onOpen:setSelected,onDrop:drop,onResizeStart:beginResize};
 return <><AgendaToolbar mode={workspace.mode} anchor={workspace.anchor} label={workspace.range.label} filters={workspace.filters} options={workspace.options} canCreate={canCreate} onMode={workspace.setMode} onAnchor={workspace.setAnchor} onFilters={workspace.setFilters} onCreate={()=>openCreate(workspace.anchor)} onReload={()=>void workspace.reload()}/><FeedbackMessage error={actionError}/><section className="cs-agenda-workspace" aria-label="Calendário da Camilla Studio">{workspace.mode==="day"?<AgendaDayView day={workspace.range.days[0]} snapMinutes={workspace.options.snapMinutes} onEmptyClick={openCreate} {...common}/>:workspace.mode==="week"?<AgendaWeekView days={workspace.range.days} snapMinutes={workspace.options.snapMinutes} onEmptyClick={openCreate} {...common}/>:<AgendaMonthView anchor={workspace.anchor} days={workspace.range.days} items={workspace.items} onCreate={day=>openCreate(day,9*60,true)} onOpen={setSelected} onDrop={(key,day)=>{const item=byKey.get(key);if(item)void drop(key,day,item.all_day?0:minutesOfDay(item.starts_at),item.all_day)}}/>}</section>{draft&&creation==="menu"&&<AgendaCreateMenu dateLabel={formatLongDay(draft.day)} onEvent={()=>setCreation("event")} onActivity={()=>setCreation("activity")} onClose={()=>{setCreation(null);setDraft(null)}}/>}{defaults&&creation==="event"&&<Modal title="Novo evento" onClose={()=>setCreation("menu")}><FeedbackMessage error={actionError}/><AgendaEventForm defaults={defaults} options={workspace.options} pending={pending} onSubmit={input=>void createEvent(input)} onCancel={()=>setCreation("menu")}/></Modal>}{defaults&&creation==="activity"&&<Modal title="Nova atividade" onClose={()=>setCreation("menu")}><FeedbackMessage error={actionError}/><AgendaActivityForm defaults={defaults} options={workspace.options} pending={pending} onSubmit={input=>void createActivity(input)} onCancel={()=>setCreation("menu")}/></Modal>}{selected&&<AgendaItemDrawer item={selected} options={workspace.options} canEdit={canEdit&&selected.editable} onClose={()=>setSelected(null)} onChanged={changed}/>}</>
}
