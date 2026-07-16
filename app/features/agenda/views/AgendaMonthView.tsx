"use client";
import type { AgendaItem } from "../types";
import { AgendaMonthCell } from "../components/AgendaMonthCell";
const weekdays=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
export function AgendaMonthView({anchor,days,items,onCreate,onOpen,onDrop}:{anchor:string;days:string[];items:AgendaItem[];onCreate:(day:string)=>void;onOpen:(item:AgendaItem)=>void;onDrop:(key:string,day:string)=>void}){return <div className="cs-agenda-month"><div className="cs-agenda-month-weekdays">{weekdays.map(day=><span key={day}>{day}</span>)}</div><div className="cs-agenda-month-grid">{days.map(day=><AgendaMonthCell key={day} day={day} currentMonth={anchor.slice(0,7)} items={items} onCreate={onCreate} onOpen={onOpen} onDrop={onDrop}/>)}</div></div>}
