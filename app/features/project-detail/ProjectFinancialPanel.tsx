"use client";

import { useState } from "react";
import { EmptyState } from "@/app/components/ui/DataState";
import { Button } from "@/app/components/ui/Button";
import { FormField, SelectField } from "@/app/components/ui/FormField";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { currencyFormatter, dateOnly } from "@/app/config/regions";
import { saveFinanceEntry } from "@/app/features/finance/finance.mutations";
import { setProjectContractValue } from "./project-detail.service";
import type { Project, ProjectFinancialEntry } from "@/app/domain/architecture-types";
import type { ProjectFinancialSummary } from "@/app/features/projects/types";

function today() { return new Date().toISOString().slice(0, 10); }

const statusLabels: Record<string, string> = {
  forecast: "Previsto",
  pending: "Pendente",
  received: "Recebido",
  paid: "Pago",
  partially_received: "Recebido parcialmente",
  partially_paid: "Pago parcialmente",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

export function ProjectFinancialPanel({ project, entries, summary, onChanged }: {
  project: Project;
  entries: ProjectFinancialEntry[];
  summary: ProjectFinancialSummary | null;
  onChanged: () => void | Promise<void>;
}) {
  const [entryOpen, setEntryOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const contractValue = summary?.contract_value ?? Number(project.contract_value || 0);
  const amountReceived = summary?.amount_received ?? Number(project.amount_received || 0);
  const balanceDue = Math.max(contractValue - amountReceived, 0);

  async function saveContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = Number(String(form.get("contract_value") || "0").replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      setError("Informe um valor de contrato válido.");
      return;
    }
    setPending(true); setError(""); setSuccess("");
    try {
      await setProjectContractValue(project.id, value);
      setSuccess("Valor do contrato atualizado.");
      setContractOpen(false);
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o contrato.");
    } finally { setPending(false); }
  }

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      await saveFinanceEntry({
        environment: "professional",
        entry_type: "income",
        description: String(form.get("description") || "").trim(),
        amount: String(form.get("amount") || "0"),
        competence_date: String(form.get("competence_date") || today()),
        due_date: String(form.get("due_date") || "") || null,
        status: String(form.get("status") || "forecast") as "forecast" | "pending" | "received",
        project_id: project.id,
        client_id: project.client_id || null,
        category_id: null,
        subcategory_id: null,
        account_id: null,
        card_id: null,
        supplier_id: null,
        cost_center_id: null,
        payment_method_id: null,
        document_number: null,
        notes: String(form.get("notes") || "").trim() || null,
      });
      setSuccess("Lançamento adicionado ao projeto e ao Financeiro geral.");
      setEntryOpen(false);
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o lançamento.");
    } finally { setPending(false); }
  }

  return <section className="cs-project-panel">
    <div className="cs-section-heading">
      <div>
        <h3>Financeiro do projeto</h3>
        <p>Dados confidenciais. O saldo é calculado pelo contrato menos os recebimentos confirmados.</p>
      </div>
      <div className="cs-row-actions">
        <Button onClick={() => { setContractOpen((value) => !value); setEntryOpen(false); }}>{contractOpen ? "Fechar" : "Alterar contrato"}</Button>
        <Button variant="primary" onClick={() => { setEntryOpen((value) => !value); setContractOpen(false); }}>{entryOpen ? "Fechar" : "Adicionar lançamento"}</Button>
      </div>
    </div>

    <FeedbackMessage error={error} success={success} />

    <div className="cs-stat-grid cs-stat-grid-3 cs-project-contract-summary">
      <article><span>Valor do contrato</span><strong>{currencyFormatter.format(contractValue)}</strong></article>
      <article><span>Valor recebido</span><strong>{currencyFormatter.format(amountReceived)}</strong></article>
      <article><span>Valor a receber</span><strong>{currencyFormatter.format(balanceDue)}</strong></article>
    </div>

    {summary && <p className="cs-finance-summary-note">
      Recebimentos vinculados: {currencyFormatter.format(summary.received_from_entries)}.
      {summary.legacy_amount_received > summary.received_from_entries && " O valor anteriormente registrado no projeto foi preservado como base de transição."}
    </p>}

    {contractOpen && <form className="cs-project-contract-form" onSubmit={saveContract}>
      <FormField label="Valor total do contrato" name="contract_value" inputMode="decimal" defaultValue={contractValue.toFixed(2)} required />
      <Button variant="primary" loading={pending}>Salvar contrato</Button>
    </form>}

    {entryOpen && <form className="cs-project-finance-form" onSubmit={submitEntry}>
      <FormField className="cs-span-2" label="Descrição da parcela" name="description" placeholder="Ex.: Parcela 2" required />
      <FormField label="Valor previsto" name="amount" inputMode="decimal" required />
      <SelectField label="Status" name="status" defaultValue="forecast">
        <option value="forecast">Previsto</option>
        <option value="pending">Pendente</option>
        <option value="received">Recebido</option>
      </SelectField>
      <FormField label="Data de competência" name="competence_date" type="date" defaultValue={today()} required />
      <FormField label="Data prevista para pagamento" name="due_date" type="date" required />
      <label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={3} /></label>
      <div className="cs-form-actions cs-span-2"><Button type="button" onClick={() => setEntryOpen(false)}>Cancelar</Button><Button variant="primary" loading={pending}>Salvar lançamento</Button></div>
    </form>}

    {entries.length === 0 ? <EmptyState title="Nenhum lançamento vinculado" description="O valor contratual permanece disponível. Cadastre previsões e recebimentos para manter o histórico detalhado." /> :
      <div className="cs-table-wrap"><table className="cs-table cs-project-finance-table">
        <thead><tr><th>Descrição</th><th>Status</th><th>Data prevista</th><th>Valor</th><th>Recebido</th><th>Em aberto</th></tr></thead>
        <tbody>{entries.map((entry) => <tr key={entry.id}>
          <td data-label="Descrição">{entry.description}</td>
          <td data-label="Status">{statusLabels[String(entry.status)] ?? entry.status ?? entry.entry_type}</td>
          <td data-label="Data prevista">{dateOnly(entry.due_date ?? entry.competence_date ?? entry.received_on)}</td>
          <td data-label="Valor">{currencyFormatter.format(Number(entry.amount || 0))}</td>
          <td data-label="Recebido">{currencyFormatter.format(Number(entry.paid_amount || 0))}</td>
          <td data-label="Em aberto">{currencyFormatter.format(Number(entry.open_amount || 0))}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
