"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { disablePushNotifications, enablePushNotifications, getPushState, isStandaloneApp, type PushState } from "@/lib/push-notifications";

type Props = { user: User | null; compact?: boolean };

const labels: Record<PushState, string> = {
  unsupported: "Não disponível neste navegador",
  blocked: "Bloqueadas nas configurações",
  disabled: "Desativadas neste aparelho",
  enabled: "Ativadas neste aparelho",
};

export function NotificationSettings({ user, compact = false }: Props) {
  const [state, setState] = useState<PushState>("disabled");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneApp());
    void getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  async function toggle() {
    if (!user) {
      setMessage("Entre na sua conta para ativar as notificações.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (state === "enabled") {
        await disablePushNotifications();
        setState("disabled");
        setMessage("Notificações desativadas neste aparelho.");
      } else {
        await enablePushNotifications(user.id);
        setState("enabled");
        setMessage("Notificações ativadas. Você receberá o resumo diário e os alertas de 10 minutos.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar as notificações.");
      setState(await getPushState());
    } finally {
      setBusy(false);
    }
  }

  return <article className={compact ? "notification-card compact" : "notification-card"}>
    <div className="notification-card-copy">
      <span className="notification-icon">🔔</span>
      <div>
        <small>NOTIFICAÇÕES DA AGENDA</small>
        <b>{labels[state]}</b>
        <p>Resumo diário às 08:00 e alerta 10 minutos antes de cada compromisso não concluído.</p>
        {!standalone && <p className="install-hint"><strong>No iPhone:</strong> abra no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. Abra pelo novo ícone para ativar os alertas.</p>}
        {message && <p className="notification-message">{message}</p>}
      </div>
    </div>
    <button className={state === "enabled" ? "event-btn danger" : "primary"} disabled={busy || state === "unsupported" || state === "blocked"} onClick={() => void toggle()}>
      {busy ? "Aguarde…" : state === "enabled" ? "Desativar" : "Ativar notificações"}
    </button>
  </article>;
}
