"use client";
import type { AgendaItem } from "../types";
import { AgendaTimeGrid } from "../components/AgendaTimeGrid";
export function AgendaWeekView(props:{days:string[];items:AgendaItem[];snapMinutes:number;onEmptyClick:(day:string,minutes:number)=>void;onOpen:(item:AgendaItem)=>void;onDrop:(key:string,day:string,minutes:number,allDay:boolean)=>void;onResizeStart:(item:AgendaItem,event:React.PointerEvent)=>void}){return <AgendaTimeGrid {...props}/>} 
