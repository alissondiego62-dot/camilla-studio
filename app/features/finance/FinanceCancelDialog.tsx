"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { formatMoney } from "./finance.money";
import type { FinanceEntryRow } from "./types";

type Props = {
  entry: FinanceEntryRow;
  canViewValues: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function FinanceCancelDialog({ entry, canViewValues, pending, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const hasSettlement = Number(entry.paid_amount || 0) > 0;
  const movementLabel = entry.entry_type === "income" ? "recebimento" : "pagamento";
  const actionLabel = hasSettlement ? "Estornar e cancelar" : `Cancelar ${entry.entry_type === "income" ? "receita" : "despesa"}`;

  return (
    <Modal title={hasSettlement ? "Estornar baixa e cancelar lançamento" : "Cancelar lançamento financeiro"} onClose={onClose}>
      <div className="cs-finance-cancel-summary">
        <strong>{entry.description}</strong>
        <span>{formatMoney(entry.amount, canViewValues)}</span>
      </div>
      <p className="cs-confirm-message">
        {hasSettlement
          ? `Este lançamento possui ${movementLabel} registrado. A confirmação estornará todas as baixas e ajustes ativos, corrigirá o saldo da conta e cancelará o lançamento sem apagar o histórico.`
          : "O lançamento sairá dos valores previstos e continuará preservado no histórico financeiro."}
      </p>
      <label className="cs-field">
        <span>Motivo do cancelamento</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Informe o motivo do cancelamento"
          autoFocus
        />
      </label>
      <div className="cs-form-actions">
        <Button type="button" onClick={onClose}>Voltar</Button>
        <Button
          type="button"
          variant="danger"
          loading={pending}
          disabled={reason.trim().length < 5}
          onClick={() => onConfirm(reason.trim())}
        >
          {actionLabel}
        </Button>
      </div>
    </Modal>
  );
}
