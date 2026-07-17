"use client";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { usePermissions } from "@/app/hooks/usePermissions";
import { agendaReducer, emptyAgendaState } from "./agenda.reducer";
import { getAgendaRange, moveItemTo, todayKey } from "./agenda-date-utils";
import { getAgendaItem, listAgendaItems, listAgendaOptions, updateAgendaItem } from "./agenda.service";
import { useAgendaRealtime } from "./useAgendaRealtime";
import type { AgendaFilters, AgendaItem, AgendaMode, AgendaOptions } from "./types";
import { defaultAgendaFilters } from "./types";

const emptyOptions:AgendaOptions={projects:[],clients:[],users:[],statuses:[],snapMinutes:15};
export function useAgendaWorkspace(initialClientId=""){
 const permissions=usePermissions();const[state,dispatch]=useReducer(agendaReducer,emptyAgendaState);const[options,setOptions]=useState(emptyOptions);const[mode,setMode]=useState<AgendaMode>("month");const[anchor,setAnchor]=useState(todayKey());const[filters,setFilters]=useState<AgendaFilters>(()=>({...defaultAgendaFilters,clientId:initialClientId}));const[loading,setLoading]=useState(true);const[error,setError]=useState("");
 const range=useMemo(()=>getAgendaRange(anchor,mode),[anchor,mode]);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const[items,nextOptions]=await Promise.all([listAgendaItems(range.startIso,range.endIso),listAgendaOptions()]);dispatch({type:"replace",items});setOptions(nextOptions)}catch(reason){setError(reason instanceof Error?reason.message:"Erro ao carregar a Agenda.")}finally{setLoading(false)}},[range.endIso,range.startIso]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load]);
 const onUpsert=useCallback((item:AgendaItem)=>{const start=new Date(item.starts_at);const end=new Date(item.ends_at);if(start<new Date(range.endIso)&&end>=new Date(range.startIso))dispatch({type:"upsert",item});else dispatch({type:"remove",key:item.item_key})},[range.endIso,range.startIso]);
 const onRemove=useCallback((key:string)=>dispatch({type:"remove",key}),[]);useAgendaRealtime({enabled:permissions.can("agenda","view"),onUpsert,onRemove});
 const allItems=useMemo(()=>state.order.map(key=>state.items[key]).filter(Boolean),[state]);
 const items=useMemo(()=>allItems.filter(item=>(filters.showCancelled||item.status!=="cancelled")&&(!filters.responsibleId||item.responsible_user_id===filters.responsibleId)&&(!filters.projectId||item.project_id===filters.projectId)&&(!filters.clientId||item.client_id===filters.clientId)&&(!filters.itemType||item.item_type===filters.itemType)&&(!filters.status||item.status===filters.status)),[allItems,filters]);
 const move=useCallback(async(item:AgendaItem,key:string,minutes:number,allDay=false)=>{const previous=item;const nextTimes=moveItemTo(item,key,minutes,allDay);dispatch({type:"upsert",item:{...item,starts_at:nextTimes.startsAt,ends_at:nextTimes.endsAt,all_day:allDay,updated_at:new Date().toISOString()}});try{await updateAgendaItem({sourceType:item.source_type,sourceId:item.source_id,...nextTimes});const fresh=await getAgendaItem(item.source_type,item.source_id);if(fresh)dispatch({type:"upsert",item:fresh})}catch(reason){dispatch({type:"upsert",item:previous});throw reason}},[]);
 const resize=useCallback(async(item:AgendaItem,endsAt:string)=>{const previous=item;dispatch({type:"upsert",item:{...item,ends_at:endsAt,updated_at:new Date().toISOString()}});try{await updateAgendaItem({sourceType:item.source_type,sourceId:item.source_id,startsAt:item.starts_at,endsAt,allDay:item.all_day});const fresh=await getAgendaItem(item.source_type,item.source_id);if(fresh)dispatch({type:"upsert",item:fresh})}catch(reason){dispatch({type:"upsert",item:previous});throw reason}},[]);
 return{permissions,state,items,options,mode,setMode,anchor,setAnchor,filters,setFilters,range,loading,error,reload:load,move,resize,upsert:onUpsert,remove:onRemove};
}
