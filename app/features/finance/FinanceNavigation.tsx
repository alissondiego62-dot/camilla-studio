"use client";
import type { FinanceSection } from "./types";
const sections:Array<[FinanceSection,string]>=[["overview","Visão geral"],["revenue","Receitas"],["expenses","Despesas"],["receivables","Contas a receber"],["payables","Contas a pagar"],["cash-flow","Fluxo de caixa"],["categories","Categorias"],["accounts","Contas"],["cards","Cartões"],["templates","Modelos"],["auxiliary","Cadastros auxiliares"],["reports","Relatórios"]];
export function FinanceNavigation({active,onChange}:{active:FinanceSection;onChange:(section:FinanceSection)=>void}){return <nav className="cs-finance-navigation" aria-label="Seções do Financeiro">{sections.map(([id,label])=><button type="button" className={active===id?"active":""} key={id} onClick={()=>onChange(id)}>{label}</button>)}</nav>}
