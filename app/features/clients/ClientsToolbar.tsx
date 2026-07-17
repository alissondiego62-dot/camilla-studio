"use client";
import { Button } from "@/app/components/ui/Button";
import { ClientsFilters } from "./ClientsFilters";
import type { ClientFilters, ClientFormOptions } from "./types";
export function ClientsToolbar(props:{filters:ClientFilters;options:ClientFormOptions;canCreate:boolean;onFilters:(value:ClientFilters)=>void;onApply:()=>void;onClear:()=>void;onCreate:()=>void;onReload:()=>void}){return <div className="cs-clients-toolbar"><ClientsFilters value={props.filters} options={props.options} onChange={props.onFilters} onApply={props.onApply} onClear={props.onClear}/><div className="cs-clients-toolbar-actions"><Button onClick={props.onReload}>Atualizar</Button>{props.canCreate&&<Button variant="primary" onClick={props.onCreate}>Novo cliente</Button>}</div></div>}
