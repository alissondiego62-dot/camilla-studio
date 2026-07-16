"use client";

import{useCallback,useMemo,useState}from"react";
import type{FormEvent}from"react";
import{currencyFormatter,dateOnly}from"@/app/config/regions";
import{ModuleFrame}from"@/app/components/ui/ModuleFrame";
import{Button}from"@/app/components/ui/Button";
import{Modal}from"@/app/components/ui/Modal";
import{EmptyState,ErrorState,LoadingState}from"@/app/components/ui/DataState";
import{FeedbackMessage}from"@/app/components/ui/FeedbackMessage";
import{FormField,SelectField}from"@/app/components/ui/FormField";
import{AccessDenied}from"@/app/components/security/PermissionGate";
import{useModuleData}from"@/app/hooks/useModuleData";
import{useAsyncAction}from"@/app/hooks/useAsyncAction";
import{usePermissions}from"@/app/hooks/usePermissions";
import{createFinanceEntry,listFinanceEntries,settleFinanceEntry}from"./finance.service";

type Environment="professional"|"personal";
export function FinancePage(){
  const{can}=usePermissions();
  const canProfessional=can("finance_professional","view");const canPersonal=can("finance_personal","view");
  const loader=useCallback(()=>listFinanceEntries(),[]);const{data:items,loading,error,reload}=useModuleData(loader,[]);
  const action=useAsyncAction();const[selectedEnvironment,setSelectedEnvironment]=useState<Environment>(canProfessional?"professional":"personal");const[open,setOpen]=useState(false);
  const environment:Environment=(selectedEnvironment==="professional"&&canProfessional)||(selectedEnvironment==="personal"&&canPersonal)?selectedEnvironment:canProfessional?"professional":"personal";
  const moduleName=environment==="personal"?"finance_personal":"finance_professional";
  const canCreate=can(moduleName,"create");const canSettle=can(moduleName,"settle_finance");
  const filtered=items.filter(item=>item.environment===environment);
  const sums=useMemo(()=>filtered.reduce((totals,item)=>{if(item.entry_type==="income")totals.income+=Number(item.amount);if(item.entry_type==="expense")totals.expense+=Number(item.amount);return totals},{income:0,expense:0}),[filtered]);
  if(!canProfessional&&!canPersonal)return <ModuleFrame title="Financeiro"><AccessDenied/></ModuleFrame>;
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const result=await action.run(()=>createFinanceEntry({environment,entry_type:String(form.get("entry_type")),description:String(form.get("description")||"").trim(),amount:Number(form.get("amount")),competence_date:String(form.get("competence_date")),due_date:String(form.get("due_date")||"")||null}),"Lançamento cadastrado.");if(result.ok){setOpen(false);await reload()}}
  async function settle(id:string){const result=await action.run(()=>settleFinanceEntry(id),"Lançamento baixado.");if(result.ok)await reload()}
  return <ModuleFrame title="Financeiro" subtitle="Ambientes pessoal e profissional com permissões independentes" actions={canCreate?<Button variant="primary" onClick={()=>{action.clearFeedback();setOpen(true)}}>Novo lançamento</Button>:undefined}>
    <div className="cs-toolbar"><div className="cs-segmented">{canProfessional&&<button type="button" className={environment==="professional"?"active":""} onClick={()=>setSelectedEnvironment("professional")}>Profissional / CNPJ</button>}{canPersonal&&<button type="button" className={environment==="personal"?"active":""} onClick={()=>setSelectedEnvironment("personal")}>Pessoal</button>}</div><Button onClick={()=>void reload()}>Atualizar</Button></div>
    <section className="cs-stat-grid cs-stat-grid-3"><article className="cs-stat"><span>Receitas</span><strong>{currencyFormatter.format(sums.income)}</strong></article><article className="cs-stat"><span>Despesas</span><strong>{currencyFormatter.format(sums.expense)}</strong></article><article className="cs-stat"><span>Resultado</span><strong>{currencyFormatter.format(sums.income-sums.expense)}</strong></article></section>
    <FeedbackMessage error={action.error} success={action.success}/>{error&&<ErrorState message={error} onRetry={()=>void reload()}/>} 
    {loading?<LoadingState/>:filtered.length===0?<EmptyState title="Sem lançamentos" description={`Nenhum lançamento no ambiente ${environment==="personal"?"pessoal":"profissional"}.`}/>:<div className="cs-table-wrap"><table className="cs-table"><thead><tr><th>Descrição</th><th>Tipo</th><th>Competência</th><th>Vencimento</th><th>Status</th><th>Valor</th><th>Ação</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id}><td data-label="Descrição"><strong>{item.description}</strong></td><td data-label="Tipo">{item.entry_type==="income"?"Receita":"Despesa"}</td><td data-label="Competência">{dateOnly(item.competence_date)}</td><td data-label="Vencimento">{dateOnly(item.due_date)}</td><td data-label="Status"><span className="cs-badge">{item.status}</span></td><td data-label="Valor">{currencyFormatter.format(Number(item.amount))}</td><td data-label="Ação">{item.status!=="paid"&&canSettle?<Button variant="text" loading={action.pending} onClick={()=>void settle(item.id)}>Dar baixa</Button>:"—"}</td></tr>)}</tbody></table></div>}
    {open&&<Modal title="Novo lançamento" onClose={()=>setOpen(false)}><form className="cs-form-grid" onSubmit={submit}><SelectField label="Tipo" name="entry_type"><option value="income">Receita</option><option value="expense">Despesa</option></SelectField><FormField label="Valor" name="amount" type="number" step="0.01" min="0" required/><FormField className="cs-span-2" label="Descrição" name="description" required/><FormField label="Competência" name="competence_date" type="date" required/><FormField label="Vencimento" name="due_date" type="date"/><div className="cs-form-actions"><Button type="button" onClick={()=>setOpen(false)}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar</Button></div></form></Modal>}
  </ModuleFrame>;
}
