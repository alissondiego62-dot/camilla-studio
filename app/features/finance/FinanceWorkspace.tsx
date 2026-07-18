"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { AccessDenied } from "@/app/components/security/PermissionGate";
import { FinanceNavigation } from "./FinanceNavigation";
import { FinanceToolbar } from "./FinanceToolbar";
import { FinanceEntryDrawer } from "./FinanceEntryDrawer";
import { FinancePaymentDrawer } from "./FinancePaymentDrawer";
import { FinanceTransferDrawer } from "./FinanceTransferDrawer";
import { FinanceInstallmentDrawer } from "./FinanceInstallmentDrawer";
import { FinanceDeleteDialog } from "./FinanceDeleteDialog";
import { useFinanceWorkspace } from "./useFinanceWorkspace";
import { FinanceOverview } from "./views/FinanceOverview";
import { FinanceRevenue } from "./views/FinanceRevenue";
import { FinanceExpenses } from "./views/FinanceExpenses";
import { FinanceReceivables } from "./views/FinanceReceivables";
import { FinancePayables } from "./views/FinancePayables";
import { FinanceCashFlow } from "./views/FinanceCashFlow";
import { FinanceCatalogManager } from "./views/FinanceCatalogManager";
import { FinanceTemplatesWorkspace } from "./views/FinanceTemplatesWorkspace";
import { FinanceAuxiliaryRecords } from "./views/FinanceAuxiliaryRecords";
import { FinanceReports } from "./views/FinanceReports";
import type { FinanceEnvironment, FinanceSection } from "./types";

const sections=new Set<FinanceSection>(["overview","revenue","expenses","receivables","payables","cash-flow","categories","accounts","cards","templates","auxiliary","reports"]);

export function FinanceWorkspace(){
 const params=useSearchParams();const router=useRouter();
 const initialEnvironment: FinanceEnvironment = "professional";
 const initialSection=sections.has(params.get("section") as FinanceSection)?params.get("section") as FinanceSection:"overview";
 const workspace=useFinanceWorkspace(initialEnvironment,initialSection);
 const { setEntryId } = workspace;
 const canProfessional=workspace.isAdministrator&&workspace.permissions.can("finance_professional","view");
 useEffect(()=>{const entry=params.get("entry");const create=params.get("new");if(entry)setEntryId(entry);else if(create==="1")setEntryId("new")},[params,setEntryId]);
 function updateUrl(environment:FinanceEnvironment,section:FinanceSection,entry?:string|null){const next=new URLSearchParams(params.toString());next.set("environment",environment);next.set("section",section);if(entry==="new"){next.delete("entry");next.set("new","1")}else if(entry){next.delete("new");next.set("entry",entry)}else{next.delete("entry");next.delete("new")}router.replace(`/finance?${next.toString()}`,{scroll:false})}
 function changeSection(next:FinanceSection){workspace.setSection(next);workspace.setPage(0);updateUrl(workspace.environment,next,null)}
 function openEntry(id:string|"new"|null){workspace.setEntryId(id);updateUrl(workspace.environment,workspace.section,id)}
 if(!canProfessional)return <ModuleFrame title="Financeiro"><AccessDenied/></ModuleFrame>;
 const canArchive=workspace.permissions.can(workspace.moduleName,"archive");const canCancel=workspace.permissions.can(workspace.moduleName,"cancel_entry");const canDuplicate=workspace.canCreate;const canManageAccounts=workspace.permissions.can(workspace.moduleName,"manage_accounts");const canManageCards=workspace.permissions.can(workspace.moduleName,"manage_cards");const canManageCategories=workspace.permissions.can(workspace.moduleName,"manage_categories");const canManageTemplates=workspace.permissions.can(workspace.moduleName,"manage_templates");const canManageAux=workspace.permissions.can(workspace.moduleName,"manage_suppliers")||workspace.permissions.can(workspace.moduleName,"manage_cost_centers");const canTransfer=workspace.environment!=="consolidated"&&workspace.permissions.can(workspace.moduleName,"manage_transfers");const canRecurrence=workspace.environment!=="consolidated"&&workspace.permissions.can(workspace.moduleName,"manage_recurrence");
 return <ModuleFrame title="Financeiro" subtitle="Gestão financeira profissional do escritório">
  <FinanceNavigation active={workspace.section} onChange={changeSection}/>
  <FinanceToolbar filters={workspace.filters} onFilters={(value)=>{workspace.setFilters(value);workspace.setPage(0)}} onPeriod={workspace.changePeriod} options={workspace.data.options} environment={workspace.environment} onNew={()=>openEntry("new")} onTransfer={()=>workspace.setTransferOpen(true)} onRecurrence={()=>void workspace.generateRecurrence()} onReload={()=>void workspace.resetToCurrentMonthAndReload()} canCreate={workspace.canCreate&&workspace.environment!=="consolidated"} canTransfer={canTransfer} canRecurrence={canRecurrence}/>
  <FeedbackMessage error={workspace.action.error} success={workspace.action.success}/>{workspace.error&&<ErrorState message={workspace.error} onRetry={()=>void workspace.reload()}/>} {workspace.loading?<LoadingState/>:<>
   {workspace.section==="overview"&&<FinanceOverview data={workspace.data} canViewValues={workspace.canViewValues} canApprove={workspace.permissions.can(workspace.moduleName,"approve_finance")} onReview={(id,decision,reason)=>void workspace.reviewApproval(id,decision,reason)}/>} 
   {workspace.section==="revenue"&&<FinanceRevenue items={workspace.visibleEntries} canViewValues={workspace.canViewValues} canSettle={workspace.canSettle} onOpen={openEntry} onSettle={workspace.setPaymentEntry} canDelete={canArchive} onDelete={workspace.setDeleteEntry}/>} 
   {workspace.section==="expenses"&&<FinanceExpenses items={workspace.visibleEntries} canViewValues={workspace.canViewValues} canSettle={workspace.canSettle} onOpen={openEntry} onSettle={workspace.setPaymentEntry} canDelete={canArchive} onDelete={workspace.setDeleteEntry}/>} 
   {workspace.section==="receivables"&&<FinanceReceivables items={workspace.visibleEntries} canViewValues={workspace.canViewValues} canSettle={workspace.canSettle} onOpen={openEntry} onSettle={workspace.setPaymentEntry} canDelete={canArchive} onDelete={workspace.setDeleteEntry}/>} 
   {workspace.section==="payables"&&<FinancePayables items={workspace.visibleEntries} canViewValues={workspace.canViewValues} canSettle={workspace.canSettle} onOpen={openEntry} onSettle={workspace.setPaymentEntry} canDelete={canArchive} onDelete={workspace.setDeleteEntry}/>} 
   {workspace.section==="cash-flow"&&<FinanceCashFlow points={workspace.data.timeline} metrics={workspace.data.metrics} canViewValues={workspace.canViewValues}/>} 
   {workspace.section==="categories"&&workspace.environment!=="consolidated"&&<FinanceCatalogManager title="Categorias" description="Categorias e subcategorias separadas por ambiente e natureza." table="financial_categories" items={[...workspace.data.options.categories,...workspace.data.options.subcategories]} environment={workspace.storedEnvironment} canManage={canManageCategories} onReload={()=>void workspace.resetToCurrentMonthAndReload()}/>} 
   {workspace.section==="accounts"&&workspace.environment!=="consolidated"&&<FinanceCatalogManager title="Contas" description="Contas bancárias, caixa físico, carteiras e contas digitais." table="financial_accounts" items={workspace.data.options.accounts} environment={workspace.storedEnvironment} canManage={canManageAccounts} onReload={()=>void workspace.resetToCurrentMonthAndReload()} typeOptions={[["bank","Conta bancária"],["cash","Caixa físico"],["wallet","Carteira"],["digital","Conta digital"],["investment","Investimento"],["other","Outro"]]}/>} 
   {workspace.section==="cards"&&workspace.environment!=="consolidated"&&<FinanceCatalogManager title="Cartões" description="Cartões pessoais ou empresariais sem armazenar dados sensíveis completos." table="financial_cards" items={workspace.data.options.cards} accounts={workspace.data.options.accounts} environment={workspace.storedEnvironment} canManage={canManageCards} onReload={()=>void workspace.resetToCurrentMonthAndReload()}/>} 
   {workspace.section==="templates"&&workspace.environment!=="consolidated"&&<FinanceTemplatesWorkspace environment={workspace.storedEnvironment} options={workspace.data.options} canManageTemplates={canManageTemplates} canManageRecurrence={canRecurrence} onReload={()=>void workspace.resetToCurrentMonthAndReload()}/>} 
   {workspace.section==="auxiliary"&&workspace.environment!=="consolidated"&&<FinanceAuxiliaryRecords environment={workspace.storedEnvironment} options={workspace.data.options} canManage={canManageAux} onReload={()=>void workspace.resetToCurrentMonthAndReload()}/>} 
   {workspace.section==="reports"&&<FinanceReports environment={workspace.environment} filters={workspace.filters} canExport={workspace.canExport} canViewValues={workspace.canViewValues}/>} 
   {["categories","accounts","cards","templates","auxiliary"].includes(workspace.section)&&workspace.environment==="consolidated"&&<EmptyState title="Cadastro indisponível no consolidado" description="Escolha Pessoal ou Profissional para gerenciar os cadastros do ambiente."/>}
  </>}
  {workspace.entryId&&workspace.environment!=="consolidated"&&<FinanceEntryDrawer entry={workspace.selectedEntry} isNew={workspace.entryId==="new"} environment={workspace.storedEnvironment} options={workspace.data.options} canEdit={workspace.canEdit} canSettle={workspace.canSettle} canArchive={canArchive} canCancel={canCancel} canDuplicate={canDuplicate} canInstallments={workspace.permissions.can(workspace.moduleName,"manage_installments")} canChangeEnvironment={false} canViewValues={workspace.canViewValues} pending={workspace.action.pending} onClose={()=>openEntry(null)} onSave={(input)=>void workspace.save(input)} onSettle={workspace.setPaymentEntry} onDuplicate={(id)=>void workspace.duplicate(id)} onInstallment={workspace.setInstallmentEntry} onChangeEnvironment={(id,target,reason)=>void workspace.moveEnvironment(id,target,reason)} onArchive={(id)=>void workspace.archive(id)} onReactivate={(id)=>void workspace.reactivate(id)} onCancel={(id,reason)=>void workspace.cancel(id,reason)}/>} 
  {workspace.deleteEntry&&<FinanceDeleteDialog entry={workspace.deleteEntry} canViewValues={workspace.canViewValues} pending={workspace.action.pending} onClose={()=>workspace.setDeleteEntry(null)} onConfirm={(reason)=>void workspace.remove(workspace.deleteEntry!.id,reason)}/>}
  {workspace.paymentEntry&&<FinancePaymentDrawer entry={workspace.paymentEntry} options={workspace.data.options} pending={workspace.action.pending} canViewValues={workspace.canViewValues} onClose={()=>workspace.setPaymentEntry(null)} onSave={(input)=>void workspace.settle(input)}/>} 
  {workspace.installmentEntry&&<FinanceInstallmentDrawer entry={workspace.installmentEntry} pending={workspace.action.pending} canViewValues={workspace.canViewValues} onClose={()=>workspace.setInstallmentEntry(null)} onSave={(id,count,date)=>void workspace.installment(id,count,date)}/>} 
  {workspace.transferOpen&&workspace.environment!=="consolidated"&&<FinanceTransferDrawer environment={workspace.storedEnvironment} options={workspace.data.options} pending={workspace.action.pending} onClose={()=>workspace.setTransferOpen(false)} onSave={(input)=>void workspace.transfer(input)}/>} 
 </ModuleFrame>
}
