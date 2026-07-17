import { formatMoney } from "../finance.money";
import type { FinanceChartPoint, FinanceMetrics } from "../types";

type CashFlowRow = { point: FinanceChartPoint; projectedBalance: number };

export function FinanceCashFlow({
  points,
  metrics,
  canViewValues,
}: {
  points: FinanceChartPoint[];
  metrics: FinanceMetrics;
  canViewValues: boolean;
}) {
  const rows = points.reduce<CashFlowRow[]>((result, point) => {
    const previousBalance = result.length
      ? result[result.length - 1].projectedBalance
      : Number(metrics.current_balance);
    return [...result, { point, projectedBalance: previousBalance + Number(point.result) }];
  }, []);

  return (
    <section className="cs-card cs-finance-cash-flow">
      <header>
        <div><h2>Fluxo de caixa</h2><p>Entradas, saídas e saldo projetado.</p></div>
        <strong>{formatMoney(metrics.projected_balance, canViewValues)}</strong>
      </header>
      <div className="cs-table-wrap">
        <table className="cs-table">
          <thead><tr><th>Período</th><th>Entradas</th><th>Saídas</th><th>Resultado</th><th>Saldo projetado</th></tr></thead>
          <tbody>
            {rows.map(({ point, projectedBalance }) => (
              <tr key={point.label}>
                <td data-label="Período">{point.label}</td>
                <td data-label="Entradas">{formatMoney(point.income, canViewValues)}</td>
                <td data-label="Saídas">{formatMoney(point.expense, canViewValues)}</td>
                <td data-label="Resultado">{formatMoney(point.result, canViewValues)}</td>
                <td data-label="Saldo projetado" className={projectedBalance < 0 ? "is-overdue" : ""}>{formatMoney(projectedBalance, canViewValues)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
