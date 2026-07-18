"use client";

import Link from "next/link";
import { currencyFormatter, dateOnly } from "@/app/config/regions";
import type { FinanceProjectSummary } from "../types";

export function FinanceProjectContracts({ items }: { items: FinanceProjectSummary[] }) {
  const sorted = [...items].sort((a, b) => b.balance_due - a.balance_due);
  const totals = items.reduce((summary, item) => ({
    contract: summary.contract + item.contract_value,
    received: summary.received + item.amount_received,
    balance: summary.balance + item.balance_due,
    dated: summary.dated + item.receivable_dated,
    undated: summary.undated + item.receivable_undated,
    overdue: summary.overdue + item.overdue_amount,
  }), { contract: 0, received: 0, balance: 0, dated: 0, undated: 0, overdue: 0 });

  return <section className="cs-card cs-finance-project-contracts">
    <header>
      <div><h2>Posição contratual por projeto</h2><p>Consolidação permanente dos contratos. Estes valores não dependem do filtro de período.</p></div>
      <strong>{items.length} projetos</strong>
    </header>
    <div className="cs-finance-contract-totals" aria-label="Totais contratuais">
      <article><span>Contratos</span><strong>{currencyFormatter.format(totals.contract)}</strong></article>
      <article><span>Recebido</span><strong>{currencyFormatter.format(totals.received)}</strong></article>
      <article><span>A receber</span><strong>{currencyFormatter.format(totals.balance)}</strong></article>
      <article><span>Com data</span><strong>{currencyFormatter.format(totals.dated)}</strong></article>
      <article><span>Sem data</span><strong>{currencyFormatter.format(totals.undated)}</strong></article>
      <article><span>Vencido</span><strong>{currencyFormatter.format(totals.overdue)}</strong></article>
    </div>
    {sorted.length === 0 ? <p>Nenhum projeto com informação contratual disponível.</p> :
      <div className="cs-table-wrap"><table className="cs-table">
        <thead><tr><th>Projeto</th><th>Cliente</th><th>Contrato</th><th>Recebido</th><th>Com data</th><th>Sem data</th><th>A receber</th><th>Próximo vencimento</th><th /></tr></thead>
        <tbody>{sorted.map((item) => <tr key={item.project_id}>
          <td data-label="Projeto"><strong>{item.project_code}</strong><span>{item.project_name}</span></td>
          <td data-label="Cliente">{item.client_name ?? "—"}</td>
          <td data-label="Contrato" className="cs-money-cell">{currencyFormatter.format(item.contract_value)}</td>
          <td data-label="Recebido" className="cs-money-cell is-received">{currencyFormatter.format(item.amount_received)}</td>
          <td data-label="Com data" className="cs-money-cell">{currencyFormatter.format(item.receivable_dated)}</td>
          <td data-label="Sem data" className="cs-money-cell is-open">{currencyFormatter.format(item.receivable_undated)}</td>
          <td data-label="A receber" className="cs-money-cell is-open">{currencyFormatter.format(item.balance_due)}</td>
          <td data-label="Próximo vencimento">{dateOnly(item.next_due_date)}</td>
          <td data-label="Ações"><Link className="cs-link-button" href={`/projects/${item.project_id}?section=finance`}>Abrir projeto</Link></td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
