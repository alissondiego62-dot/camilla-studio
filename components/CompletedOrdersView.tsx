import type { Order, Sector } from "@/lib/pcp-types";

type CompletedOrdersViewProps = {
  search: string;
  orders: Order[];
  sectors: Sector[];
  canOperate: boolean;
  onSearchChange: (value: string) => void;
  onOpenHistory: (order: Order) => void;
  onReopen: (order: Order) => void;
};

export function CompletedOrdersView({
  search,
  orders,
  sectors,
  canOperate,
  onSearchChange,
  onOpenHistory,
  onReopen,
}: CompletedOrdersViewProps) {
  return (
    <section className="management-view">
      <div className="view-toolbar">
        <label>
          ⌕
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar nos concluídos…"
          />
        </label>
        <span>{orders.length} concluídos</span>
      </div>

      {orders.length ? (
        <div className="responsive-table completed-orders-table">
          <div className="table-head">
            <span>OP</span>
            <span>Cliente e serviço</span>
            <span>Setor final</span>
            <span>Entrega</span>
            <span>Ações</span>
          </div>

          {orders.map((order) => (
            <article className="table-row" key={order.id}>
              <b>OP {order.op_number}</b>
              <div>
                <strong>{order.client_name}</strong>
                <small>{order.description}</small>
              </div>
              <span>
                {sectors.find((sector) => sector.id === order.sector_id)?.name || "Concluído"}
              </span>
              <span>
                {new Date(`${order.delivery_date}T12:00:00`).toLocaleDateString("pt-BR")}
              </span>
              <div className="completed-order-actions">
                <button
                  type="button"
                  className="history-order-button"
                  onClick={() => onOpenHistory(order)}
                >
                  <span className="completed-action-icon" aria-hidden="true">🕘</span>
                  <span>Ver Histórico</span>
                </button>
                {canOperate && (
                  <button
                    type="button"
                    className="reopen-order-button"
                    onClick={() => onReopen(order)}
                  >
                    <span className="completed-action-icon" aria-hidden="true">↩</span>
                    <span>Reabrir Produção</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="view-empty">
          <b>Nenhum pedido concluído</b>
          <span>Os pedidos finalizados aparecerão aqui.</span>
        </div>
      )}
    </section>
  );
}
