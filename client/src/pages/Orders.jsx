import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOrders } from "../api/orders";
import { useAuth } from "../hooks/useAuth";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function Orders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const data = await getOrders({ page }, token);
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

  if (loading) {
    return <p>Loading orders...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div>
        <h1>Your orders</h1>
        <p>You have no orders yet.</p>
        <Link to="/products">Browse products</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Your orders</h1>
      <ul>
        {orders.map((order) => (
          <li key={order._id}>
            <p>Placed on {dateFormatter.format(new Date(order.createdAt))}</p>
            <p>Status: {order.status}</p>
            <ul>
              {order.items.map((item) => (
                <li key={item.product}>
                  {item.name} x {item.quantity} (
                  {priceFormatter.format(item.price)} each)
                </li>
              ))}
            </ul>
            <p>Total: {priceFormatter.format(order.totalAmount)}</p>
          </li>
        ))}
      </ul>

      <div>
        <button
          type="button"
          onClick={() => setPage((p) => p - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>{" "}
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>{" "}
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= pagination.totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Orders;
