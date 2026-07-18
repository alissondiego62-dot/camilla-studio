"use client";
import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { FinanceLineChart } from "../charts/FinanceLineChart";
import { FinanceBarChart } from "../charts/FinanceBarChart";
import { FinanceCategoryChart } from "../charts/FinanceCategoryChart";
import { FinanceStatusChart } from "../charts/FinanceStatusChart";
import { formatMoney } from "../finance.money";
import type { FinanceApproval, FinanceWorkspaceData } from "../types";
import { FinanceProjectContracts } from "./FinanceProjectContracts";

export function FinanceOverview({data,canViewValues,canApprove,onReview}:{data:FinanceWorkspaceData;canViewValues:boolean;canApprove:boolean;onReview:(id:string,decision:"approved"|"rejected",reason:string)=>void}){
 const metrics=[['Saldo atual',data.metrics.current_balance],['Receitas previstas',data.metrics.expected_income],['Receitas realizadas',data.metrics.realized_income],['Despesas previstas',data.metrics.expected_expense],['Despesas realizadas',data.metrics.realized_expense],['Resultado líquido',data.metrics.net_result],['Contas a receber',data.metrics.receivable],['Contas a pagar',data.metrics.payable],['Valores vencidos',data.metrics.overdue],['Projeção de caixa',data.metrics.projected_balance]];
 const[selected,setSelected]=useState<FinanceApproval|null>(null);const[reason,setReason]=useState("");
 return <div className="cs-finance-overview"><section className="cs-finance-metric-grid">{metrics.map(([label,value])=><article key={label}><span>{label}</span><strong>{formatMoney(value,canViewValues)}</strong></article>)}</section>
 {data.approvals.length>0&&<section className="cs-card cs-finance-approvals"><header><div><h2>Aguardando aprovação</h2><p>Solicitações do ambiente que exigem análise financeira.</p></div><strong>{data.approvals.length}</strong></header><div className="cs-finance-catalog-grid">{data.approvals.map((approval)=><article className="cs-card" key={approval.id}><span>{approval.record_type}</span><strong>Solicitação pendente</strong><small>{new Date(approval.requested_at).toLocaleString("pt-BR",{timeZone:"America/Boa_Vista",hour12:false})}</small>{canApprove&&<Button variant="text" onClick={()=>setSelected(approval)}>Analisar</Button>}</article>)}</div></section>}
 <section className="cs-finance-dashboard-grid"><article className="cs-card cs-finance-chart-card"><header><h2>Receitas e despesas</h2><span>Movimentação no período</span></header><FinanceLineChart points={data.timeline}/></article><article className="cs-card cs-finance-chart-card"><header><h2>Previsto x realizado</h2><span>Comparação do período</span></header><FinanceBarChart points={data.timeline}/></article><article className="cs-card cs-finance-chart-card"><header><h2>Despesas por categoria</h2><span>Participação no total</span></header><FinanceCategoryChart items={data.categories_chart} canViewValues={canViewValues}/></article><article className="cs-card cs-finance-chart-card"><header><h2>Situação dos lançamentos</h2><span>Pagos, pendentes e vencidos</span></header><FinanceStatusChart items={data.statuses_chart} canViewValues={canViewValues}/></article></section>
 <FinanceProjectContracts items={data.project_summaries}/>
 {selected&&<Modal title="Analisar solicitação financeira" onClose={()=>setSelected(null)}><label className="cs-field"><span>Justificativa da decisão</span><textarea rows={4} value={reason} onChange={(event)=>setReason(event.target.value)}/></label><div className="cs-form-actions"><Button onClick={()=>setSelected(null)}>Voltar</Button><Button variant="danger" onClick={()=>{onReview(selected.id,"rejected",reason||"Solicitação devolvida para revisão.");setSelected(null);setReason("")}}>Rejeitar</Button><Button variant="primary" onClick={()=>{onReview(selected.id,"approved",reason||"Solicitação aprovada.");setSelected(null);setReason("")}}>Aprovar</Button></div></Modal>}
 </div>
}
