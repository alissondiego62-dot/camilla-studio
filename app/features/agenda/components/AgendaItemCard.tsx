"use client";
import type { CSSProperties } from "react";
import { timeKey } from "../agenda-date-utils";
import type { AgendaItem } from "../types";
const labels:Record<string,string>={activity:"Atividade",subactivity:"Subatividade",project_deadline:"Prazo",meeting:"Reunião",visit:"Visita",presentation:"Apresentação",personal:"Pessoal",other:"Evento"};
export function AgendaItemCard({item,style,compact=false,onOpen,onResizeStart}:{item:AgendaItem;style?:CSSProperties;compact?:boolean;onOpen:(item:AgendaItem)=>void;onResizeStart?:(item:AgendaItem,event:React.PointerEvent)=>void}){
 return <article draggable={item.editable} onDragStart={event=>{event.dataTransfer.setData("text/agenda-key",item.item_key);event.dataTransfer.effectAllowed="move"}} onClick={event=>{event.stopPropagation();onOpen(item)}} className={`cs-agenda-item source-${item.source_type} status-${item.status} ${compact?"is-compact":""}`} style={{...style,"--agenda-item-color":item.color??undefined}as CSSProperties} title={`${item.title} · ${labels[item.item_type]??item.item_type}`}>
  <div className="cs-agenda-item-heading"><strong>{item.title}</strong>{!compact&&!item.all_day&&<time>{timeKey(item.starts_at)}</time>}</div>
  {!compact&&<small>{labels[item.item_type]??item.item_type}{item.project_name?` · ${item.project_name}`:""}</small>}
  {onResizeStart&&item.editable&&!item.all_day&&<button type="button" className="cs-agenda-resize-handle" aria-label={`Alterar duração de ${item.title}`} onPointerDown={event=>onResizeStart(item,event)}/>} 
 </article>
}
