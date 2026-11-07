import { useEffect, useState } from "react";
import { getVendorOrders, updateOrderStatus } from "../../api/orders";
import Pagination from "../../components/Pagination";
import { useAuth } from "../../hooks/useAuth";
import { formatPrice } from "../../utils/formatPrice";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const CANCELLABLE = ["pending", "confirmed"];

const NEXT_STATUS = {
  pending: { status: "confirmed", label: "Confirm" },
  confirmed: { status: "shipped", label: "Mark shipped" },
  shipped: { status: "delivered", label: "Mark delivered" },
};

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

const DEFAULT_STATUS_STYLE = "bg-slate-100 text-slate-700";

function VendorOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const data = await getVendorOrders({ page }, token);
        if (!cancelled) {
          setOrders(data.orders);
          setPagination(data.pagination);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [page, token]);

  async function handleStatusChange(orderId, status) {
    setActionError("");
    setUpdatingId(orderId);

    try {
      const data = await updateOrderStatus(orderId, status, token);
      setOrders((current) =>
        current.map((order) => (order._id === orderId ? data.order : order)),
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
          Customer orders
        </h1>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-40 rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {error}
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          No orders yet
        </h1>
        <p className="mt-2 text-slate-500">
          Orders for your products will show up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        Customer orders
      </h1>

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      <ul className="space-y-4">
        {orders.map((order) => {
          const next = NEXT_STATUS[order.status];
          const busy = updatingId === order._id;

          return (
            <li
              key={order._id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    Order #{order._id.slice(-8)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {order.customer?.name ?? "Customer"} on{" "}
                    {dateFormatter.format(new Date(order.createdAt))}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    STATUS_STYLES[order.status] ?? DEFAULT_STATUS_STYLE
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <ul className="divide-y divide-slate-100 px-5">
                {order.items.map((item) => (
                  <li
                    key={item.product}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-slate-500">
                        {item.quantity} x {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="font-medium text-slate-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                <p className="text-slate-900">
                  <span className="text-sm text-slate-500">Your subtotal </span>
                  <span className="text-lg font-bold">
                    {formatPrice(order.subtotal)}
                  </span>
                </p>
                <div className="flex gap-2">
                  {CANCELLABLE.includes(order.status) && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order._id, "cancelled")}
                      disabled={busy}
                      className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel order
                    </button>
                  )}
                  {next && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order._id, next.status)}
                      disabled={busy}
                      className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Updating..." : next.label}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}

export default VendorOrders;
