"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/app/components/ui/DataState";
import { Button } from "@/app/components/ui/Button";
import { FormField, SelectField } from "@/app/components/ui/FormField";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { Modal } from "@/app/components/ui/Modal";
import { currencyFormatter, dateOnly } from "@/app/config/regions";
import { normalizeMoneyInput } from "@/app/features/finance/finance.money";
import { cancelFinanceEntry, removeFinanceEntry, saveFinanceEntry, settleFinanceEntry, settleProjectReceivable } from "@/app/features/finance/finance.mutations";
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

type FinanceOptions = {
  accounts: Array<{ id: string; name: string }>;
  paymentMethods: Array<{ id: string; name: string }>;
};

export function ProjectFinancialPanel({ project, entries, summary, options, onChanged }: {
  project: Project;
  entries: ProjectFinancialEntry[];
  summary: ProjectFinancialSummary | null;
  options: FinanceOptions;
  onChanged: () => void | Promise<void>;
}) {
  const [entryOpen, setEntryOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [paymentEntry, setPaymentEntry] = useState<ProjectFinancialEntry | null>(null);
  const [receiveContract, setReceiveContract] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<ProjectFinancialEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [cancelEntry, setCancelEntry] = useState<ProjectFinancialEntry | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const contractValue = summary?.contract_value ?? Number(project.contract_value || 0);
  const amountReceived = summary?.amount_received ?? Number(project.amount_received || 0);
  const balanceDue = summary?.balance_due ?? Math.max(contractValue - amountReceived, 0);
  const receivableDated = summary?.receivable_dated ?? entries.reduce((total, entry) => total + (entry.due_date ? Number(entry.open_amount || 0) : 0), 0);
  const receivableUndated = summary?.receivable_undated ?? Math.max(balanceDue - receivableDated, 0);
  const overdueAmount = summary?.overdue_amount ?? 0;
  const receivedPercent = contractValue > 0 ? Math.min((amountReceived / contractValue) * 100, 100) : 0;
  const openEntries = useMemo(() => entries.reduce((total, entry) => total + Number(entry.open_amount || 0), 0), [entries]);
  const unallocatedAmount = Math.max(balanceDue - openEntries, 0);

  async function runAction(action: () => Promise<unknown>, message: string) {
    setPending(true); setError(""); setSuccess("");
    try {
      await action();
      setSuccess(message);
      await onChanged();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a operação financeira.");
      return false;
    } finally { setPending(false); }
  }

  async function saveContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = Number(String(form.get("contract_value") || "0").replace(",", "."));
    if (!Number.isFinite(value) || value < 0) { setError("Informe um valor de contrato válido."); return; }
    if (await runAction(() => setProjectContractValue(project.id, value), "Valor do contrato atualizado.")) setContractOpen(false);
  }

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await runAction(() => saveFinanceEntry({
      environment: "professional",
      entry_type: "income",
      description: String(form.get("description") || "").trim(),
      amount: String(form.get("amount") || "0"),
      competence_date: String(form.get("competence_date") || today()),
      due_date: String(form.get("due_date") || "") || null,
      status: "forecast",
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
    }), "Receita prevista adicionada ao projeto e ao Financeiro geral.");
    if (ok) setEntryOpen(false);
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const accountId = String(form.get("account_id") || "");
    if (!accountId) { setError("Selecione a conta que receberá o valor."); return; }
    const common = {
      amount: normalizeMoneyInput(String(form.get("amount") || "0")),
      paid_at: new Date(`${String(form.get("paid_at") || today())}T12:00:00-04:00`).toISOString(),
      account_id: accountId,
      payment_method_id: String(form.get("payment_method_id") || "") || null,
      discount_amount: "0.00",
      interest_amount: "0.00",
      fine_amount: "0.00",
      document_number: String(form.get("document_number") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    };
    const ok = paymentEntry
      ? await runAction(() => settleFinanceEntry({ entry_id: paymentEntry.id, ...common }), "Recebimento registrado.")
      : await runAction(() => settleProjectReceivable(project.id, { description: String(form.get("description") || `Recebimento — ${project.name}`).trim(), ...common }), "Recebimento contratual registrado.");
    if (ok) { setPaymentEntry(null); setReceiveContract(false); }
  }

  async function confirmDelete() {
    if (!deleteEntry) return;
    const ok = await runAction(() => removeFinanceEntry(deleteEntry.id, deleteReason.trim()), "Lançamento excluído do financeiro ativo e preservado na auditoria.");
    if (ok) { setDeleteEntry(null); setDeleteReason(""); }
  }

  async function confirmCancel() {
    if (!cancelEntry) return;
    const hasSettlement = Number(cancelEntry.paid_amount || 0) > 0;
    const ok = await runAction(
      () => cancelFinanceEntry(cancelEntry.id, cancelReason.trim()),
      hasSettlement ? "Baixa estornada e lançamento cancelado." : "Lançamento cancelado.",
    );
    if (ok) { setCancelEntry(null); setCancelReason(""); }
  }

  return <section className="cs-project-panel">
    <div className="cs-section-heading">
      <div>
        <h3>Financeiro do projeto</h3>
        <p>Contrato, recebimentos confirmados e valores ainda pendentes, inclusive os que não possuem data prevista.</p>
      </div>
      <div className="cs-row-actions">
        <Button onClick={() => { setContractOpen((value) => !value); setEntryOpen(false); }}>{contractOpen ? "Fechar" : "Alterar contrato"}</Button>
        <Button onClick={() => { setEntryOpen((value) => !value); setContractOpen(false); }}>{entryOpen ? "Fechar" : "Nova previsão"}</Button>
        {unallocatedAmount > 0 && <Button variant="primary" onClick={() => setReceiveContract(true)}>Registrar recebimento</Button>}
      </div>
    </div>

    <FeedbackMessage error={error} success={success} />

    <div className="cs-stat-grid cs-project-finance-summary">
      <article><span>Valor do contrato</span><strong>{currencyFormatter.format(contractValue)}</strong></article>
      <article><span>Recebido</span><strong>{currencyFormatter.format(amountReceived)}</strong><small>{receivedPercent.toFixed(1)}% do contrato</small></article>
      <article><span>A receber total</span><strong>{currencyFormatter.format(balanceDue)}</strong></article>
      <article><span>Com data prevista</span><strong>{currencyFormatter.format(receivableDated)}</strong></article>
      <article><span>Sem data prevista</span><strong>{currencyFormatter.format(receivableUndated)}</strong></article>
      <article><span>Vencido</span><strong>{currencyFormatter.format(overdueAmount)}</strong></article>
    </div>

    {unallocatedAmount > 0 && <p className="cs-finance-reconciliation-warning">Há {currencyFormatter.format(unallocatedAmount)} do contrato ainda sem parcela cadastrada. Esse valor permanece contabilizado como receita prevista sem data.</p>}

    {contractOpen && <form className="cs-project-contract-form" onSubmit={saveContract}>
      <FormField label="Valor total do contrato" name="contract_value" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={contractValue.toFixed(2)} required />
      <Button variant="primary" loading={pending}>Salvar contrato</Button>
    </form>}

    {entryOpen && <form className="cs-project-finance-form" onSubmit={submitEntry}>
      <FormField className="cs-span-2" label="Descrição da previsão" name="description" placeholder="Ex.: Parcela 2" required />
      <FormField label="Valor previsto" name="amount" inputMode="decimal" required />
      <FormField label="Data de competência" name="competence_date" type="date" defaultValue={today()} required />
      <FormField label="Data prevista para pagamento/recebimento" name="due_date" type="date" />
      <p className="cs-span-2 cs-field-help">A data é opcional. Sem data, o valor continuará aparecendo em “A receber sem data prevista”.</p>
      <label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={3} /></label>
      <div className="cs-form-actions cs-span-2"><Button type="button" onClick={() => setEntryOpen(false)}>Cancelar</Button><Button variant="primary" loading={pending}>Salvar previsão</Button></div>
    </form>}

    {entries.length === 0 ? <EmptyState title="Nenhum lançamento vinculado" description="O saldo contratual continua contabilizado como receita prevista sem data. Registre parcelas ou recebimentos para detalhar o histórico." /> :
      <div className="cs-table-wrap"><table className="cs-table cs-project-finance-table">
        <thead><tr><th>Descrição</th><th>Status</th><th>Data prevista</th><th>Valor</th><th>Recebido</th><th>Em aberto</th><th>Ações</th></tr></thead>
        <tbody>{entries.map((entry) => {
          const paid = Number(entry.paid_amount || 0);
          const open = Number(entry.open_amount || 0);
          return <tr key={entry.id}>
            <td data-label="Descrição">{entry.description}</td>
            <td data-label="Status">{statusLabels[String(entry.status)] ?? entry.status ?? entry.entry_type}</td>
            <td data-label="Data prevista">{entry.due_date ? dateOnly(entry.due_date) : <span className="cs-finance-no-date">Sem data prevista</span>}</td>
            <td data-label="Valor">{currencyFormatter.format(Number(entry.amount || 0))}</td>
            <td data-label="Recebido">{currencyFormatter.format(paid)}</td>
            <td data-label="Em aberto">{currencyFormatter.format(open)}</td>
            <td data-label="Ações"><div className="cs-finance-row-actions">
              {open > 0 && <Button variant="text" onClick={() => setPaymentEntry(entry)}>{entry.entry_type === "expense" ? "Pagar" : "Liquidar"}</Button>}
              {entry.status !== "cancelled" && <Button variant="text" onClick={() => setCancelEntry(entry)}>{paid > 0 ? "Estornar e cancelar" : "Cancelar"}</Button>}
              {paid === 0 && <Button variant="text" onClick={() => setDeleteEntry(entry)}>Excluir</Button>}
            </div></td>
          </tr>;
        })}</tbody>
      </table></div>}

    {(paymentEntry || receiveContract) && <Modal title={paymentEntry ? "Liquidar receita" : "Registrar recebimento do contrato"} onClose={() => { setPaymentEntry(null); setReceiveContract(false); }}>
      <form className="cs-project-finance-payment-form" onSubmit={submitPayment}>
        {!paymentEntry && <FormField className="cs-span-2" label="Descrição" name="description" defaultValue={`Recebimento — ${project.name}`} required />}
        <FormField label="Valor recebido" name="amount" inputMode="decimal" max={(paymentEntry ? Number(paymentEntry.open_amount || 0) : unallocatedAmount).toFixed(2)} defaultValue={(paymentEntry ? Number(paymentEntry.open_amount || 0) : unallocatedAmount).toFixed(2)} required />
        <FormField label="Data do recebimento" name="paid_at" type="date" defaultValue={today()} required />
        <SelectField label="Conta de entrada" name="account_id" required defaultValue={options.accounts[0]?.id ?? ""}><option value="">Selecione</option>{options.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
        <SelectField label="Forma de recebimento" name="payment_method_id"><option value="">Não informada</option>{options.paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
        <FormField label="Documento/comprovante" name="document_number" />
        <label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={3} /></label>
        <div className="cs-form-actions cs-span-2"><Button type="button" onClick={() => { setPaymentEntry(null); setReceiveContract(false); }}>Cancelar</Button><Button variant="primary" loading={pending}>Confirmar recebimento</Button></div>
      </form>
    </Modal>}

    {cancelEntry && <Modal title={Number(cancelEntry.paid_amount || 0) > 0 ? "Estornar baixa e cancelar lançamento" : "Cancelar lançamento financeiro"} onClose={() => setCancelEntry(null)}>
      <p>{Number(cancelEntry.paid_amount || 0) > 0
        ? `Este lançamento possui ${cancelEntry.entry_type === "expense" ? "pagamento" : "recebimento"} registrado. A confirmação estornará as baixas e ajustes ativos, corrigirá o saldo da conta e cancelará o lançamento.`
        : "O lançamento será retirado dos valores previstos e permanecerá preservado no histórico."}</p>
      <label className="cs-field"><span>Motivo do cancelamento</span><textarea rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} autoFocus /></label>
      <div className="cs-form-actions"><Button onClick={() => setCancelEntry(null)}>Voltar</Button><Button variant="danger" loading={pending} disabled={cancelReason.trim().length < 5} onClick={() => void confirmCancel()}>{Number(cancelEntry.paid_amount || 0) > 0 ? "Estornar e cancelar" : "Cancelar lançamento"}</Button></div>
    </Modal>}

    {deleteEntry && <Modal title="Excluir lançamento financeiro" onClose={() => setDeleteEntry(null)}>
      <p>O lançamento será removido das telas, mas continuará preservado na auditoria. Lançamentos com recebimentos registrados não podem ser excluídos sem estorno.</p>
      <label className="cs-field"><span>Motivo da exclusão</span><textarea rows={3} value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} autoFocus /></label>
      <div className="cs-form-actions"><Button onClick={() => setDeleteEntry(null)}>Cancelar</Button><Button variant="danger" loading={pending} disabled={deleteReason.trim().length < 3} onClick={() => void confirmDelete()}>Excluir lançamento</Button></div>
    </Modal>}
  </section>;
}
