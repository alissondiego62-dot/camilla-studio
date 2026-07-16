"use client";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { AppShell } from "./AppShell";
import { LoadingState } from "./DataState";

type Stats = { projects:number; late:number; activities:number; clients:number; income:number; expense:number };
const brl = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" });
export function DashboardModule(){
 const [stats,setStats]=useState<Stats>({projects:0,late:0,activities:0,clients:0,income:0,expense:0}); const [loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{if(!isSupabaseConfigured){setLoading(false);return;} const today=new Date().toISOString().slice(0,10); const [p,l,a,c,f]=await Promise.all([
 supabase.from("projects").select("id",{count:"exact",head:true}).neq("stage","completed"),
 supabase.from("projects").select("id",{count:"exact",head:true}).lt("main_deadline",today).neq("stage","completed"),
 supabase.from("project_activities").select("id",{count:"exact",head:true}).neq("status","completed"),
 supabase.from("clients").select("id",{count:"exact",head:true}),
 supabase.from("financial_entries").select("entry_type,amount,status")]);
 let income=0,expense=0; for(const row of (f.data??[]) as Array<{entry_type:string;amount:number}>){if(row.entry_type==="income")income+=Number(row.amount); if(row.entry_type==="expense")expense+=Number(row.amount);} setStats({projects:p.count??0,late:l.count??0,activities:a.count??0,clients:c.count??0,income,expense}); setLoading(false);})();},[]);
 return <AppShell title="Dashboard" subtitle="Visão executiva e operacional do escritório">{loading?<LoadingState/>:<><section className="v3-stat-grid">
 {[["Projetos ativos",stats.projects,"Em produção"],["Projetos atrasados",stats.late,"Exigem atenção"],["Atividades abertas",stats.activities,"Pendências"],["Clientes",stats.clients,"Base ativa"]].map(([t,v,s])=><article className="v3-stat" key={String(t)}><span>{t}</span><strong>{v}</strong><small>{s}</small></article>)}
 </section><section className="v3-grid-2"><article className="v3-card"><header><h2>Resumo financeiro</h2></header><div className="v3-finance-summary"><div><span>Receitas</span><strong>{brl.format(stats.income)}</strong></div><div><span>Despesas</span><strong>{brl.format(stats.expense)}</strong></div><div><span>Resultado</span><strong>{brl.format(stats.income-stats.expense)}</strong></div></div></article><article className="v3-card"><header><h2>Prioridades</h2></header><ul className="v3-clean-list"><li><b>{stats.late}</b> projetos com prazo vencido</li><li><b>{stats.activities}</b> atividades em aberto</li><li><b>{stats.projects}</b> projetos ativos</li></ul></article></section></>}</AppShell>;
}
