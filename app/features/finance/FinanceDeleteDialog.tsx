"use client";
import { useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { formatMoney } from "./finance.money";
import type { FinanceEntryRow } from "./types";

export function FinanceDeleteDialog({entry,canViewValues,pending,onClose,onConfirm}:{entry:FinanceEntryRow;canViewValues:boolean;pending:boolean;onClose:()=>void;onConfirm:(reason:string)=>void}){
 const[reason,setReason]=useState("");
 return <Modal title="Excluir registro financeiro" onClose={onClose} className="cs-finance-delete-modal">
  <div className="cs-finance-delete-content">
   <p>O registro será removido das telas financeiras, mas permanecerá preservado para auditoria.</p>
   <dl><div><dt>Descrição</dt><dd>{entry.description}</dd></div><div><dt>Projeto</dt><dd>{entry.project_name||"Sem projeto"}</dd></div><div><dt>Valor</dt><dd>{formatMoney(entry.amount,canViewValues)}</dd></div></dl>
   <label><span>Motivo da exclusão</span><textarea value={reason} onChange={(event)=>setReason(event.target.value)} rows={3} placeholder="Ex.: registro criado para teste" autoFocus required/></label>
   <div className="cs-form-actions"><Button type="button" onClick={onClose}>Cancelar</Button><Button type="button" variant="primary" loading={pending} disabled={reason.trim().length<3} onClick={()=>onConfirm(reason.trim())}>Excluir registro</Button></div>
  </div>
 </Modal>
}
