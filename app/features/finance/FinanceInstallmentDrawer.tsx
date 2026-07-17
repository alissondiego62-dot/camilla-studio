"use client";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { formatMoney } from "./finance.money";
import type { FinanceEntryRow } from "./types";
export function FinanceInstallmentDrawer({entry,pending,canViewValues,onClose,onSave}:{entry:FinanceEntryRow;pending:boolean;canViewValues:boolean;onClose:()=>void;onSave:(entryId:string,count:number,firstDueDate:string)=>void}){
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);onSave(entry.id,Number(form.get("count")||2),String(form.get("first_due_date")))}
 return <div className="cs-drawer-backdrop" role="presentation" onMouseDown={onClose}><aside className="cs-finance-payment-drawer" role="dialog" aria-modal="true" onMouseDown={(event)=>event.stopPropagation()}><header className="cs-drawer-header"><div><small>Parcelamento</small><h2>{entry.description}</h2></div><button type="button" aria-label="Fechar" onClick={onClose}>×</button></header><form className="cs-drawer-body cs-finance-entry-form" onSubmit={submit}><article className="cs-finance-payment-summary"><span>Valor total</span><strong>{formatMoney(entry.amount,canViewValues)}</strong></article><p className="cs-help-text">O lançamento atual será transformado na primeira parcela. Os centavos restantes serão distribuídos sem perda de valor.</p><FormField label="Quantidade de parcelas" name="count" type="number" min="2" max="360" defaultValue="2" required/><FormField label="Primeiro vencimento" name="first_due_date" type="date" defaultValue={entry.due_date??new Date().toISOString().slice(0,10)} required/><div className="cs-form-actions"><Button type="button" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={pending}>Criar parcelas</Button></div></form></aside></div>
}
