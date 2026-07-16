"use client";
import { Button } from "@/app/components/ui/Button";
import { shiftAnchor, todayKey } from "./agenda-date-utils";
import { AgendaFilters } from "./AgendaFilters";
import type { AgendaFilters as Filters, AgendaMode, AgendaOptions } from "./types";
export function AgendaToolbar({mode,anchor,label,filters,options,canCreate,onMode,onAnchor,onFilters,onCreate,onReload}:{mode:AgendaMode;anchor:string;label:string;filters:Filters;options:AgendaOptions;canCreate:boolean;onMode:(mode:AgendaMode)=>void;onAnchor:(value:string)=>void;onFilters:(value:Filters)=>void;onCreate:()=>void;onReload:()=>void}){
 return <div className="cs-agenda-toolbar-stack">
  <div className="cs-toolbar cs-agenda-toolbar"><div className="cs-segmented">{(["day","week","month"]as AgendaMode[]).map(value=><button type="button" key={value} className={mode===value?"active":""} onClick={()=>onMode(value)}>{value==="day"?"Dia":value==="week"?"Semana":"Mês"}</button>)}</div><div className="cs-period-controls"><Button aria-label="Período anterior" onClick={()=>onAnchor(shiftAnchor(anchor,mode,-1))}>‹</Button><Button onClick={()=>onAnchor(todayKey())}>Hoje</Button><Button aria-label="Próximo período" onClick={()=>onAnchor(shiftAnchor(anchor,mode,1))}>›</Button></div><strong className="cs-period-label">{label}</strong><div className="cs-agenda-toolbar-actions"><Button onClick={onReload}>Atualizar</Button>{canCreate&&<Button variant="primary" onClick={onCreate}>Novo</Button>}</div></div>
  <AgendaFilters value={filters} options={options} onChange={onFilters}/>
 </div>
}
