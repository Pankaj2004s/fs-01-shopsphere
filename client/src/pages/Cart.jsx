import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCart, removeCartItem, updateCartItem } from "../api/cart";
import { useAuth } from "../hooks/useAuth";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Cart() {
  const { token } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

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

  if (loading) {
    return <p>Loading cart...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div>
        <h1>Your cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/products">Browse products</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Your cart</h1>
      {actionError && <p role="alert">{actionError}</p>}
      <ul>
        {cart.items.map((item) => (
          <li key={item.product._id}>
            <Link to={`/products/${item.product._id}`}>{item.product.name}</Link>
            <p>{priceFormatter.format(item.product.price)} each</p>
            <label htmlFor={`qty-${item.product._id}`}>Quantity</label>{" "}
            <input
              id={`qty-${item.product._id}`}
              type="number"
              min={1}
              max={Math.min(99, item.product.stock)}
              value={item.quantity}
              onChange={(e) =>
                handleQuantityChange(item.product._id, Number(e.target.value))
              }
            />
            <p>Line total: {priceFormatter.format(item.lineTotal)}</p>
            <button
              type="button"
              onClick={() => handleRemove(item.product._id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p>Total: {priceFormatter.format(cart.total)}</p>
    </div>
  );
}

export default Cart;
