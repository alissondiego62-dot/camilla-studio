import { formatMoney } from "../finance.money";
import type { FinanceStatusPoint } from "../types";
export function FinanceStatusChart({items,canViewValues}:{items:FinanceStatusPoint[];canViewValues:boolean}){return <div className="cs-finance-status-chart">{items.map((item)=><article key={item.label}><span className={`status-${item.label}`}/><div><strong>{item.count}</strong><small>{item.label}</small></div><b>{formatMoney(item.amount,canViewValues)}</b></article>)}</div>}
