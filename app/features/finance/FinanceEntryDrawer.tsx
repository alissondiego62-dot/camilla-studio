"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/app/components/a11y/FocusTrap";
import { Modal } from "@/app/components/ui/Modal";
import { dateOnly } from "@/app/config/regions";
import { formatMoney } from "./finance.money";
import { FinanceEntryForm } from "./FinanceEntryForm";
import type { FinanceEntryInput, FinanceEntryRow, FinanceStoredEnvironment, FinanceWorkspaceOptions } from "./types";

type Props = {
  entry: FinanceEntryRow | null;
  isNew: boolean;
  environment: FinanceStoredEnvironment;
  options: FinanceWorkspaceOptions;
  canEdit: boolean;
  canSettle: boolean;
  canArchive: boolean;
  canCancel: boolean;
  canDuplicate: boolean;
  canInstallments: boolean;
  canChangeEnvironment: boolean;
  canViewValues: boolean;
  pending: boolean;
  onClose: () => void;
  onSave: (input: FinanceEntryInput) => void;
  onSettle: (entry: FinanceEntryRow) => void;
  onDuplicate: (id: string) => void;
  onInstallment: (entry: FinanceEntryRow) => void;
  onChangeEnvironment: (id: string, target: FinanceStoredEnvironment, reason: string) => void;
  onArchive: (id: string) => void;
  onReactivate: (id: string) => void;
  onCancel: (id: string, reason: string) => void;
};

export function FinanceEntryDrawer({
  entry, isNew, environment, options, canEdit, canSettle, canArchive, canCancel,
  canDuplicate, canInstallments, canChangeEnvironment, canViewValues, pending, onClose, onSave, onSettle, onDuplicate,
  onInstallment, onChangeEnvironment, onArchive, onReactivate, onCancel,
}: Props) {
  const [editing, setEditing] = useState(isNew);
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useBodyScrollLock(true);
  useFocusTrap(dialogRef, onClose);
  const [confirm, setConfirm] = useState<"archive" | "cancel" | "environment" | null>(null);
  const [reason, setReason] = useState("");

  function confirmAction() {
    if (!entry || !confirm) return;
    if (confirm === "archive") onArchive(entry.id);
    else if (confirm === "environment") onChangeEnvironment(entry.id, environment === "personal" ? "professional" : "personal", reason.trim() || "Mudança de ambiente confirmada pela interface.");
    else onCancel(entry.id, reason.trim() || "Cancelamento solicitado pela interface.");
    setConfirm(null);
    setReason("");
  }

  return (
    <div className="cs-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside ref={dialogRef} className="cs-finance-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <header className="cs-drawer-header">
          <div>
            <small>{environment === "personal" ? "Financeiro pessoal" : "Financeiro profissional"}</small>
            <h2 id={titleId}>{isNew ? "Novo lançamento" : entry?.description}</h2>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose}>×</button>
        </header>

        <div className="cs-drawer-body">
          {editing ? (
            <FinanceEntryForm
              entry={entry}
              environment={environment}
              options={options}
              pending={pending}
              onCancel={() => isNew ? onClose() : setEditing(false)}
              onSave={onSave}
            />
          ) : entry ? (
            <div className="cs-finance-entry-detail">
              <section className="cs-finance-detail-hero">
                <span>{entry.entry_type === "income" ? "Receita" : "Despesa"}</span>
                <strong>{formatMoney(entry.amount, canViewValues)}</strong>
                <em className={`cs-finance-status status-${entry.effective_status}`}>{entry.effective_status}</em>
              </section>
              <dl className="cs-finance-detail-grid">
                <div><dt>Competência</dt><dd>{dateOnly(entry.competence_date)}</dd></div>
                <div><dt>Vencimento</dt><dd>{dateOnly(entry.due_date)}</dd></div>
                <div><dt>Pago/recebido</dt><dd>{formatMoney(entry.paid_amount, canViewValues)}</dd></div>
                <div><dt>Em aberto</dt><dd>{formatMoney(entry.open_amount, canViewValues)}</dd></div>
                <div><dt>Categoria</dt><dd>{entry.category_name || "—"}</dd></div>
                <div><dt>Conta</dt><dd>{entry.account_name || "—"}</dd></div>
                <div><dt>Cliente</dt><dd>{entry.client_name || "—"}</dd></div>
                <div><dt>Projeto</dt><dd>{entry.project_name || "—"}</dd></div>
              </dl>
              {entry.notes && <article className="cs-card"><h3>Observações</h3><p>{entry.notes}</p></article>}
            </div>
          ) : null}
        </div>

        <footer className="cs-drawer-footer">
          {!isNew && entry && (entry.archived_at ? (
            canArchive && <Button onClick={() => onReactivate(entry.id)}>Reativar</Button>
          ) : (
            <>
              {canDuplicate && <Button onClick={() => onDuplicate(entry.id)}>Duplicar</Button>}
              {canInstallments && entry.installment_group_id === null && entry.paid_amount === "0.00" && <Button onClick={() => onInstallment(entry)}>Parcelar</Button>}
              {canChangeEnvironment && entry.paid_amount === "0.00" && <Button onClick={() => setConfirm("environment")}>Mover de ambiente</Button>}
              {canCancel && entry.status !== "cancelled" && <Button variant="danger" onClick={() => setConfirm("cancel")}>Cancelar</Button>}
              {canArchive && <Button onClick={() => setConfirm("archive")}>Arquivar</Button>}
              {canSettle && entry.open_amount !== "0.00" && entry.status !== "cancelled" && <Button variant="primary" onClick={() => onSettle(entry)}>Registrar baixa</Button>}
              {canEdit && <Button variant="primary" onClick={() => setEditing(true)}>Editar</Button>}
            </>
          ))}
        </footer>
      </aside>

      {confirm && (
        <Modal title={confirm === "archive" ? "Arquivar lançamento" : confirm === "environment" ? "Mover lançamento de ambiente" : "Cancelar lançamento"} onClose={() => setConfirm(null)}>
          <p className="cs-confirm-message">
            {confirm === "archive"
              ? "O registro continuará no histórico e poderá ser reativado."
              : confirm === "environment"
                ? `O lançamento será movido para o Financeiro ${environment === "personal" ? "Profissional / CNPJ" : "Pessoal"}. Vínculos incompatíveis serão removidos e a ação ficará no histórico.`
                : "Informe o motivo do cancelamento. Esta ação não apaga o histórico."}
          </p>
          {confirm !== "archive" && (
            <label className="cs-field">
              <span>{confirm === "environment" ? "Justificativa" : "Motivo"}</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
            </label>
          )}
          <div className="cs-form-actions">
            <Button type="button" onClick={() => setConfirm(null)}>Voltar</Button>
            <Button type="button" variant="danger" loading={pending} onClick={confirmAction}>
              {confirm === "archive" ? "Arquivar" : confirm === "environment" ? "Mover ambiente" : "Cancelar lançamento"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
