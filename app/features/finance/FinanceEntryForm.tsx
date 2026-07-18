"use client";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/Button";
import { FormField, SelectField } from "@/app/components/ui/FormField";
import { normalizeMoneyInput } from "./finance.money";
import type { FinanceEntryInput, FinanceEntryRow, FinanceStoredEnvironment, FinanceWorkspaceOptions } from "./types";

function initialDate(){return new Date().toISOString().slice(0,10)}
export function FinanceEntryForm({entry,environment,options,pending,onCancel,onSave}:{entry:FinanceEntryRow|null;environment:FinanceStoredEnvironment;options:FinanceWorkspaceOptions;pending:boolean;onCancel:()=>void;onSave:(input:FinanceEntryInput)=>void}){
 const values=useMemo(()=>({description:entry?.description??"",amount:entry?.amount??"",competence:entry?.competence_date??initialDate(),due:entry?.due_date??"",type:entry?.entry_type??"income"}),[entry]);
 const[type,setType]=useState<"income"|"expense">(values.type);
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);onSave({id:entry?.id??null,environment,entry_type:type,description:String(form.get("description")||"").trim(),amount:normalizeMoneyInput(String(form.get("amount")||"0")),competence_date:String(form.get("competence_date")),due_date:String(form.get("due_date")||"")||null,status:entry?.status??"forecast",category_id:String(form.get("category_id")||"")||null,subcategory_id:String(form.get("subcategory_id")||"")||entry?.subcategory_id||null,account_id:entry?.account_id??null,card_id:type==="expense"?(String(form.get("card_id")||"")||entry?.card_id||null):null,client_id:environment==="professional"?(String(form.get("client_id")||"")||null):null,supplier_id:environment==="professional"&&type==="expense"?(String(form.get("supplier_id")||"")||null):null,project_id:environment==="professional"?(String(form.get("project_id")||"")||null):null,cost_center_id:String(form.get("cost_center_id")||"")||entry?.cost_center_id||null,payment_method_id:entry?.payment_method_id??null,document_number:String(form.get("document_number")||"").trim()||null,notes:String(form.get("notes")||"").trim()||null})}
 const categories=options.categories.filter((item)=>!item.entry_type||item.entry_type===type);
 return <form className="cs-finance-entry-form" onSubmit={submit}>
  <SelectField label="Tipo" name="entry_type" value={type} onChange={(event)=>setType(event.target.value as "income"|"expense")}><option value="income">Receita</option><option value="expense">Despesa</option></SelectField>
  <FormField label="Valor" name="amount" inputMode="decimal" defaultValue={values.amount} required/>
  <FormField className="cs-span-2" label="Descrição" name="description" defaultValue={values.description} required/>
  <FormField label="Competência" name="competence_date" type="date" defaultValue={values.competence} required/>
  <FormField label={type==="income"?"Data prevista para recebimento":"Vencimento"} name="due_date" type="date" defaultValue={values.due} hint={type==="income"?"Opcional. Sem data, a receita continua em A receber sem data prevista.":undefined}/>
  <SelectField label="Categoria" name="category_id" defaultValue={entry?.category_id??""}><option value="">Sem categoria</option>{categories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
  {environment==="professional"&&<>
   <SelectField label="Cliente" name="client_id" defaultValue={entry?.client_id??""}><option value="">Sem cliente</option>{options.clients.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
   <SelectField label="Projeto" name="project_id" defaultValue={entry?.project_id??""}><option value="">Sem projeto</option>{options.projects.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
  </>}
  <details className="cs-finance-more-options cs-span-2">
   <summary>Mais opções</summary>
   <div className="cs-finance-more-options-grid">
    <FormField label="Documento" name="document_number" defaultValue={entry?.document_number??""}/>
    <SelectField label="Subcategoria" name="subcategory_id" defaultValue={entry?.subcategory_id??""}><option value="">Sem subcategoria</option>{options.subcategories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
    <SelectField label="Centro de custo" name="cost_center_id" defaultValue={entry?.cost_center_id??""}><option value="">Sem centro de custo</option>{options.cost_centers.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
    {type==="expense"&&<SelectField label="Cartão" name="card_id" defaultValue={entry?.card_id??""}><option value="">Sem cartão</option>{options.cards.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>}
    {environment==="professional"&&type==="expense"&&<SelectField label="Fornecedor" name="supplier_id" defaultValue={entry?.supplier_id??""}><option value="">Sem fornecedor</option>{options.suppliers.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>}
    <label className="cs-span-2"><span>Observações</span><textarea name="notes" defaultValue={entry?.notes??""} rows={4}/></label>
   </div>
  </details>
  <p className="cs-span-2 cs-field-help">O status é calculado automaticamente pelas baixas, vencimento e saldo em aberto.</p>
  <div className="cs-form-actions"><Button type="button" onClick={onCancel}>Cancelar</Button><Button variant="primary" loading={pending}>Salvar</Button></div>
 </form>
}
