"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getAgendaItem } from "./agenda.service";
import type { AgendaItem, AgendaSourceType } from "./types";

const sources:Array<{table:string;type:AgendaSourceType}>=[{table:"calendar_events",type:"event"},{table:"project_activities",type:"activity"},{table:"project_dates",type:"project_date"}];
export function useAgendaRealtime({enabled,onUpsert,onRemove}:{enabled:boolean;onUpsert:(item:AgendaItem)=>void;onRemove:(key:string)=>void}){
 useEffect(()=>{if(!enabled)return;const channel=supabase.channel(`camilla-agenda-${crypto.randomUUID()}`);
  for(const source of sources)channel.on("postgres_changes",{event:"*",schema:"public",table:source.table},async(payload)=>{const row=(payload.new&&Object.keys(payload.new).length?payload.new:payload.old)as Record<string,unknown>;const id=String(row.id??"");if(!id)return;const key=`${source.type}:${id}`;if(payload.eventType==="DELETE"){onRemove(key);return}try{const item=await getAgendaItem(source.type,id);if(item)onUpsert(item);else onRemove(key)}catch{/* A próxima navegação recarrega o período. */}});
  channel.subscribe();return()=>{void supabase.removeChannel(channel)};
 },[enabled,onRemove,onUpsert]);
}
