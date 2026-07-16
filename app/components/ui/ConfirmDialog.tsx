"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

export function ConfirmDialog({ title, message, confirmLabel = "Confirmar", danger = false, pending = false, onConfirm, onClose }: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="cs-confirm-message">{message}</p>
      <div className="cs-form-actions">
        <Button type="button" onClick={onClose}>Cancelar</Button>
        <Button type="button" variant={danger ? "danger" : "primary"} loading={pending} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
