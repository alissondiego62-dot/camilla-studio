import { formatMoney } from "../finance.money";
import type { FinanceCategoryPoint } from "../types";
export function FinanceCategoryChart({items,canViewValues}:{items:FinanceCategoryPoint[];canViewValues:boolean}){return <div className="cs-finance-category-chart">{items.map((item)=><article key={item.label}><header><span>{item.label}</span><strong>{formatMoney(item.amount,canViewValues)}</strong></header><div><i style={{width:`${Math.min(100,Number(item.percentage))}%`}}/></div><small>{Number(item.percentage).toFixed(1)}%</small></article>)}</div>}
