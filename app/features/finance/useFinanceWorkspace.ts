"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import { defaultFinanceFilters, periodRange } from "./finance.filters";
import { loadFinanceWorkspace } from "./finance.repository";
import { archiveFinanceEntry, cancelFinanceEntry, changeFinanceEnvironment, createFinanceTransfer, createInstallmentEntries, duplicateFinanceEntry, generateRecurringEntries, reactivateFinanceEntry, removeFinanceEntry, reviewFinanceApproval, saveFinanceEntry, settleFinanceEntry } from "./finance.mutations";
import type { FinanceEntryInput, FinanceEntryRow, FinanceEnvironment, FinanceFilters, FinancePaymentInput, FinanceSection, FinanceStoredEnvironment, FinanceTransferInput, FinanceWorkspaceData } from "./types";
import { isFinancialAdministrator } from "@/app/services/security/financial-access";

const empty: FinanceWorkspaceData = {entries:[],total:0,metrics:{current_balance:"0.00",expected_income:"0.00",realized_income:"0.00",expected_expense:"0.00",realized_expense:"0.00",net_result:"0.00",receivable:"0.00",receivable_dated:"0.00",receivable_undated:"0.00",payable:"0.00",overdue:"0.00",projected_balance:"0.00",previous_period_result:"0.00",result_change_percent:null},timeline:[],categories_chart:[],statuses_chart:[],options:{categories:[],subcategories:[],accounts:[],cards:[],suppliers:[],cost_centers:[],payment_methods:[],clients:[],projects:[],templates:[],recurring_rules:[]},approvals:[],access:[],project_summaries:[]};

export function useFinanceWorkspace(initialEnvironment:FinanceEnvironment="professional",initialSection:FinanceSection="overview"){
 const permissions=usePermissions();const action=useAsyncAction();
 const[environment,setEnvironment]=useState<FinanceEnvironment>(initialEnvironment);const[section,setSection]=useState<FinanceSection>(initialSection);const[filters,setFilters]=useState<FinanceFilters>(defaultFinanceFilters);const[page,setPage]=useState(0);const[pageSize,setPageSize]=useState(50);const[data,setData]=useState<FinanceWorkspaceData>(empty);const[loading,setLoading]=useState(true);const[error,setError]=useState("");const[entryId,setEntryId]=useState<string|"new"|null>(null);const[paymentEntry,setPaymentEntry]=useState<FinanceEntryRow|null>(null);const[installmentEntry,setInstallmentEntry]=useState<FinanceEntryRow|null>(null);const[transferOpen,setTransferOpen]=useState(false);const[deleteEntry,setDeleteEntry]=useState<FinanceEntryRow|null>(null);const[cancelEntry,setCancelEntry]=useState<FinanceEntryRow|null>(null);
 const isAdministrator=isFinancialAdministrator(permissions.access.profileCode);
 const load=useCallback(async()=>{if(!isAdministrator){setData(empty);setError("");setLoading(false);return}setLoading(true);setError("");try{setData(await loadFinanceWorkspace(environment,section,filters,page,pageSize))}catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível carregar o Financeiro.")}finally{setLoading(false)}},[environment,filters,isAdministrator,page,pageSize,section]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load]);
 const selectedEntry=entryId&&entryId!=="new"?data.entries.find((entry)=>entry.id===entryId)??null:null;
 const storedEnvironment: FinanceStoredEnvironment = "professional";
 const moduleName = "finance_professional";
 const canViewValues=isAdministrator;
 const currentAccess=data.access.find((item)=>item.environment==="professional")??null;
 const canCreate=isAdministrator&&permissions.can(moduleName,"create")&&(currentAccess?.can_create??true);const canEdit=isAdministrator&&permissions.can(moduleName,"edit")&&(currentAccess?.can_edit??true);const canSettle=isAdministrator&&permissions.can(moduleName,"settle_finance")&&(currentAccess?.can_settle??true);const canExport=isAdministrator&&permissions.can(moduleName,"export")&&(currentAccess?.can_export??true);
 const pageCount=Math.max(1,Math.ceil(data.total/pageSize));
 function changePeriod(period:FinanceFilters["period"]){const range=period==="custom"?{start_date:filters.start_date,end_date:filters.end_date}:periodRange(period);setFilters((current)=>({...current,period,...range}));setPage(0)}
 async function save(input:FinanceEntryInput){const result=await action.run(()=>saveFinanceEntry(input),input.id?"Lançamento atualizado.":"Lançamento criado.");if(result.ok){setEntryId(result.data.id);await load()}return result}
 async function duplicate(id:string){const result=await action.run(()=>duplicateFinanceEntry(id),"Lançamento duplicado.");if(result.ok){await load();setEntryId(result.data)}}
 async function archive(id:string){const result=await action.run(()=>archiveFinanceEntry(id),"Lançamento arquivado.");if(result.ok){setEntryId(null);await load()}}
 async function remove(id:string,reason:string){const result=await action.run(()=>removeFinanceEntry(id,reason),"Registro financeiro excluído.");if(result.ok){setDeleteEntry(null);setEntryId(null);await load()}return result}
 async function reactivate(id:string){const result=await action.run(()=>reactivateFinanceEntry(id),"Lançamento reativado.");if(result.ok)await load()}
 async function cancel(id:string,reason:string){const result=await action.run(()=>cancelFinanceEntry(id,reason),"Lançamento cancelado.");if(result.ok){setCancelEntry(null);setEntryId(null);await load()}return result}
 async function settle(input:FinancePaymentInput){const result=await action.run(()=>settleFinanceEntry(input),"Baixa registrada.");if(result.ok){setPaymentEntry(null);await load()}return result}
 async function installment(entryId:string,count:number,firstDueDate:string){const result=await action.run(()=>createInstallmentEntries(entryId,count,firstDueDate),"Parcelamento criado.");if(result.ok){setInstallmentEntry(null);setEntryId(null);await load()}return result}
 async function moveEnvironment(id:string,target:FinanceStoredEnvironment,reason:string){const result=await action.run(()=>changeFinanceEnvironment(id,target,reason),"Ambiente alterado.");if(result.ok){setEntryId(null);setEnvironment(target);await load()}return result}
 async function reviewApproval(id:string,decision:"approved"|"rejected",reason:string){const result=await action.run(()=>reviewFinanceApproval(id,decision,reason),decision==="approved"?"Aprovação concluída.":"Solicitação devolvida para análise.");if(result.ok)await load();return result}
 async function transfer(input:FinanceTransferInput){const result=await action.run(()=>createFinanceTransfer(input),"Transferência registrada.");if(result.ok){setTransferOpen(false);await load()}return result}
 async function resetToCurrentMonthAndReload(){const range=periodRange("month");setFilters((current)=>({...current,period:"month",...range}));setPage(0)}
 async function generateRecurrence(){const result=await action.run(()=>generateRecurringEntries(new Date().toISOString().slice(0,10)),"Recorrências processadas.");if(result.ok)await load()}
 const visibleEntries=useMemo(()=>section==="revenue"?data.entries.filter((item)=>item.entry_type==="income"):section==="expenses"?data.entries.filter((item)=>item.entry_type==="expense"):section==="receivables"?data.entries.filter((item)=>item.entry_type==="income"&&item.open_amount!=="0.00"):section==="payables"?data.entries.filter((item)=>item.entry_type==="expense"&&item.open_amount!=="0.00"):data.entries,[data.entries,section]);
 return{permissions,action,isAdministrator,environment,setEnvironment,section,setSection,filters,setFilters,changePeriod,page,setPage,pageSize,setPageSize,pageCount,data,visibleEntries,loading,error,reload:load,entryId,setEntryId,selectedEntry,paymentEntry,setPaymentEntry,installmentEntry,setInstallmentEntry,transferOpen,setTransferOpen,deleteEntry,setDeleteEntry,cancelEntry,setCancelEntry,storedEnvironment,moduleName,canViewValues,canCreate,canEdit,canSettle,canExport,save,duplicate,archive,remove,reactivate,cancel,settle,installment,moveEnvironment,reviewApproval,transfer,resetToCurrentMonthAndReload,generateRecurrence};
}
