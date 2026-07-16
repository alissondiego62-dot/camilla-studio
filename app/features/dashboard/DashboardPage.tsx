"use client";
import { useCallback } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { LoadingState,ErrorState } from "@/app/components/ui/DataState";
import { useModuleData } from "@/app/hooks/useModuleData";
import { usePermissions } from "@/app/hooks/usePermissions";
import { currencyFormatter } from "@/app/config/regions";
import { loadDashboardStats } from "./dashboard.service";
const empty={projects:0,late:0,activities:0,clients:0,income:0,expense:0};
export function DashboardPage(){
  const{can}=usePermissions();const showFinancial=can("finance_professional","view")||can("finance_personal","view");
  const loader=useCallback(()=>loadDashboardStats(showFinancial),[showFinancial]);const{data:stats,loading,error,reload}=useModuleData(loader,empty);
  return <ModuleFrame title="Dashboard" subtitle="Visão executiva e operacional do escritório">{error&&<ErrorState message={error} onRetry={()=>void reload()}/>} {loading?<LoadingState/>:<><section className="cs-stat-grid">{[["Projetos ativos",stats.projects,"Em produção"],["Projetos atrasados",stats.late,"Exigem atenção"],["Atividades abertas",stats.activities,"Pendências"],["Clientes",stats.clients,"Base cadastrada"]].map(([title,value,description])=><article className="cs-stat" key={String(title)}><span>{title}</span><strong>{value}</strong><small>{description}</small></article>)}</section><section className="cs-grid-2">{showFinancial&&<article className="cs-card"><h2>Resumo financeiro autorizado</h2><dl className="cs-summary-list"><div><dt>Receitas</dt><dd>{currencyFormatter.format(stats.income)}</dd></div><div><dt>Despesas</dt><dd>{currencyFormatter.format(stats.expense)}</dd></div><div><dt>Resultado</dt><dd>{currencyFormatter.format(stats.income-stats.expense)}</dd></div></dl></article>}<article className="cs-card"><h2>Prioridades atuais</h2><ul className="cs-clean-list"><li><b>{stats.late}</b> projetos com prazo vencido</li><li><b>{stats.activities}</b> atividades em aberto</li><li><b>{stats.projects}</b> projetos ativos</li></ul></article></section></>}</ModuleFrame>;
}
