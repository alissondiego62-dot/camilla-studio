"use client";
import { dateKey } from "../agenda-date-utils";
import type { AgendaItem } from "../types";
import { AgendaItemCard } from "./AgendaItemCard";
export function AgendaAllDayLane({days,items,onOpen,onDrop}:{days:string[];items:AgendaItem[];onOpen:(item:AgendaItem)=>void;onDrop:(itemKey:string,day:string)=>void}){return <div className="cs-agenda-all-day"><div className="cs-agenda-all-day-label">Dia inteiro</div>{days.map(day=><div key={day} className="cs-agenda-all-day-cell" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const key=event.dataTransfer.getData("text/agenda-key");if(key)onDrop(key,day)}}>{items.filter(item=>item.all_day&&dateKey(item.starts_at)===day).map(item=><AgendaItemCard key={item.item_key} item={item} compact onOpen={onOpen}/>)}</div>)}</div>}
