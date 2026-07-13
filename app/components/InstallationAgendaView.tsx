"use client";

import type { FormEvent } from "react";
import { dueLabel, installationDateTimeLabel, toInstallationInputValue } from "../domain/formatters";
import type { DetailTab, Order, Sector } from "../domain/types";

type InstallationAgendaViewProps = {
  orders: Order[];
  sectors: Sector[];
  installationSector: Sector | null;
  canOperate: boolean;
  busyOrderId: string | null;
  onOpenOrder: (order: Order, tab: DetailTab) => void;
  onSchedule: (event: FormEvent<HTMLFormElement>, order: Order) => void;
  onRemoveSchedule: (order: Order) => void;
};

export function InstallationAgendaView({
  orders,
  sectors,
  installationSector,
  canOperate,
  busyOrderId,
  onOpenOrder,
  onSchedule,
  onRemoveSchedule,
}: InstallationAgendaViewProps) {
  const inInstallationCount = orders.filter(
    (order) => order.sector_id === installationSector?.id,
  ).length;
  const scheduledCount = orders.filter(
    (order) => order.installation_scheduled_at,
  ).length;
  const awaitingScheduleCount = orders.filter(
    (order) =>
      order.sector_id === installationSector?.id &&
      !order.installation_scheduled_at,
  ).length;

  return (
    <section className="installation-agenda">
      <div className="agenda-summary">
        <article>
          <small>NO SETOR</small>
          <strong>{inInstallationCount}</strong>
        </article>
        <article>
          <small>AGENDADOS</small>
          <strong>{scheduledCount}</strong>
        </article>
        <article>
          <small>AGUARDANDO HORÁRIO</small>
          <strong>{awaitingScheduleCount}</strong>
        </article>
      </div>

      {!installationSector ? (
        <div className="view-empty">
          <b>Setor não encontrado</b>
          <span>Ative o setor Instalação Externa para usar a agenda.</span>
        </div>
      ) : orders.length ? (
        <div className="agenda-list">
          {orders.map((order) => {
            const currentSectorName =
              sectors.find((sector) => sector.id === order.sector_id)?.name ||
              "Setor não identificado";
            const alreadyInInstallation =
              order.sector_id === installationSector.id;

            return (
              <article className="agenda-card agenda-card-detailed" key={order.id}>
                <div className="agenda-time">
                  {order.installation_scheduled_at ? (
                    <>
                      <span>
                        {new Date(order.installation_scheduled_at).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            timeZone: "America/Manaus",
                          },
                        )}
                      </span>
                      <small>
                        {new Date(order.installation_scheduled_at).toLocaleTimeString(
                          "pt-BR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "America/Manaus",
                          },
                        )}
                      </small>
                    </>
                  ) : (
                    <>
                      <span>Sem horário</span>
                      <small>Aguardando</small>
                    </>
                  )}
                </div>

                <div className="agenda-order agenda-order-detailed">
                  <b>OP {order.op_number}</b>
                  <h3>{order.client_name}</h3>
                  <p>{order.description}</p>

                  <div
                    className={`production-position ${
                      alreadyInInstallation ? "ready" : "pending"
                    }`}
                  >
                    <small>Status da produção</small>
                    <strong>
                      {alreadyInInstallation
                        ? "🟢 Em Instalação Externa"
                        : `🟡 Ainda em ${currentSectorName}`}
                    </strong>
                  </div>

                  <div className="installation-team-line">
                    <small>Equipe</small>
                    <strong>{order.installation_team || "Não definida"}</strong>
                  </div>

                  <small className="agenda-delivery">
                    Entrega: {dueLabel(order.delivery_date)}
                  </small>
                  <button
                    type="button"
                    onClick={() => onOpenOrder(order, "installation")}
                  >
                    Ver pedido
                  </button>
                </div>

                {canOperate ? (
                  <form
                    className="schedule-form"
                    onSubmit={(event) => onSchedule(event, order)}
                  >
                    <label className="wide">
                      Data e hora da instalação
                      <input
                        key={`${order.id}:${
                          order.installation_scheduled_at || "new"
                        }`}
                        type="datetime-local"
                        name="scheduled_at"
                        defaultValue={toInstallationInputValue(
                          order.installation_scheduled_at,
                        )}
                        required
                      />
                    </label>
                    <div className="actions">
                      <button
                        className="primary"
                        disabled={busyOrderId === order.id}
                      >
                        {busyOrderId === order.id
                          ? "Salvando…"
                          : order.installation_scheduled_at
                            ? "Reagendar"
                            : "Agendar"}
                      </button>
                      {order.installation_scheduled_at && (
                        <button
                          type="button"
                          disabled={busyOrderId === order.id}
                          onClick={() => onRemoveSchedule(order)}
                        >
                          Remover horário
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="schedule-readonly">
                    {order.installation_scheduled_at
                      ? `Instalação marcada para ${installationDateTimeLabel(
                          order.installation_scheduled_at,
                        )}.`
                      : "Aguardando o administrador ou operador definir o horário."}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="view-empty">
          <b>Nenhuma instalação agendada</b>
          <span>
            Agende uma instalação diretamente pela Ordem de Serviço, mesmo antes
            de ela chegar ao setor Instalação Externa.
          </span>
        </div>
      )}
    </section>
  );
}
