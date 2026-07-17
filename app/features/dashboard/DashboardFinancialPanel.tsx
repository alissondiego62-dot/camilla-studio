import Link from "next/link";
import { currencyFormatter } from "@/app/config/regions";
import { DashboardLineChart } from "./charts/DashboardLineChart";
import type { DashboardFinancial } from "./types";
export function DashboardFinancialPanel({ data }: { data: DashboardFinancial }) { if (!data.visible) return null; const cards = [["Receitas", data.income], ["Despesas", data.expense], ["Resultado", data.net], ["A receber", data.receivable], ["A pagar", data.payable], ["Vencido", data.overdue]]; return <section className="cs-card cs-dashboard-financial"><header><div><h2>Resumo financeiro profissional</h2><p>Somente dados autorizados pelo banco.</p></div><Link href="/finance">Abrir Financeiro</Link></header><div className="cs-dashboard-money-grid">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{currencyFormatter.format(Number(value))}</strong></article>)}</div><DashboardLineChart financial={data} /></section>; }
