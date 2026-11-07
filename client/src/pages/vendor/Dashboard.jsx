import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getVendorStats } from "../../api/orders";
import { useAuth } from "../../hooks/useAuth";
import { formatPrice } from "../../utils/formatPrice";

const STATUS_ORDER = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const data = await getVendorStats(token);
        if (!cancelled) setStats(data.stats);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <div className="grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-24 rounded-xl bg-slate-200" />
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Dashboard
      </h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatPrice(stats.revenue)} />
        <StatCard label="Orders" value={stats.totalOrders} />
        <StatCard label="Units sold" value={stats.unitsSold} />
        <StatCard label="Products" value={stats.productCount} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Orders by status
        </h2>
        <ul className="flex flex-wrap gap-3">
          {STATUS_ORDER.map((status) => (
            <li
              key={status}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${STATUS_STYLES[status]}`}
            >
              {status}: {stats.statusCounts[status]}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Revenue counts confirmed, shipped and delivered orders only.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Low stock
        </h2>
        {stats.lowStock.length === 0 ? (
          <p className="text-sm text-slate-500">
            All your products are well stocked.
          </p>
        ) : (
          <ul className="space-y-2">
            {stats.lowStock.map((product) => (
              <li
                key={product._id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <p className="min-w-0 truncate font-medium text-slate-900">
                  {product.name}
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      product.stock === 0
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {product.stock === 0
                      ? "Out of stock"
                      : `${product.stock} left`}
                  </span>
                  <Link
                    to={`/vendor/products/${product._id}/edit`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Restock
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
