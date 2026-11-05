import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart, removeCartItem, updateCartItem } from "../api/cart";
import { placeOrder } from "../api/orders";
import { useAuth } from "../hooks/useAuth";
import { formatPrice } from "../utils/formatPrice";

function Cart() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const data = await getCart(token);
        if (!cancelled) setCart(data.cart);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleQuantityChange(productId, quantity) {
    setActionError("");
    try {
      const data = await updateCartItem(productId, quantity, token);
      setCart(data.cart);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleRemove(productId) {
    setActionError("");
    try {
      const data = await removeCartItem(productId, token);
      setCart(data.cart);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handlePlaceOrder() {
    setActionError("");
    setPlacing(true);
    try {
      await placeOrder(token);
      navigate("/orders");
    } catch (err) {
      setActionError(err.message);
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
          Your cart
        </h1>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-28 rounded-xl bg-slate-200" />
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

  if (cart.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Your cart is empty
        </h1>
        <p className="mt-2 text-slate-500">
          You have not added anything yet.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700 active:scale-95"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        Your cart
      </h1>

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => {
            const maxQuantity = Math.min(99, item.product.stock);

            return (
              <li
                key={item.product._id}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <Link
                  to={`/products/${item.product._id}`}
                  className="block h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100"
                >
                  {item.product.images[0] && (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/products/${item.product._id}`}
                      className="font-semibold text-slate-900 transition-colors hover:text-brand-600"
                    >
                      {item.product.name}
                    </Link>
                    <p className="font-bold text-slate-900">
                      {formatPrice(item.lineTotal)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatPrice(item.product.price)} each
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(
                            item.product._id,
                            item.quantity - 1,
                          )
                        }
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="h-8 w-8 rounded-l-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                      >
                        −
                      </button>
                      <span className="flex h-8 w-10 items-center justify-center border-y border-slate-300 text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(
                            item.product._id,
                            item.quantity + 1,
                          )
                        }
                        disabled={item.quantity >= maxQuantity}
                        aria-label="Increase quantity"
                        className="h-8 w-8 rounded-r-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.product._id)}
                      className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-slate-900">
            Order summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Items</dt>
              <dd className="font-medium text-slate-900">{itemCount}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">
                {formatPrice(cart.total)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={placing}
            className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {placing ? "Placing order..." : "Place order"}
          </button>
        </aside>
      </div>
    </div>
  );
}

export default Cart;
