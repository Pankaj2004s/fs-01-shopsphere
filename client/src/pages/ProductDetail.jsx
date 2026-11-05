import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addToCart } from "../api/cart";
import { getProduct } from "../api/products";
import { useAuth } from "../hooks/useAuth";
import { formatPrice } from "../utils/formatPrice";

function ProductDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const data = await getProduct(id);
        if (!cancelled) setProduct(data.product);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleAddToCart(e) {
    e.preventDefault();

    if (!user) {
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }

    setCartMessage("");
    setCartError("");
    setAdding(true);

    try {
      await addToCart(product._id, quantity, token);
      setCartMessage("Added to cart");
    } catch (err) {
      setCartError(err.message);
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="grid animate-pulse gap-10 lg:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-slate-200" />
        <div className="space-y-4">
          <div className="h-4 w-1/4 rounded bg-slate-200" />
          <div className="h-8 w-3/4 rounded bg-slate-200" />
          <div className="h-6 w-1/3 rounded bg-slate-200" />
          <div className="h-24 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
        <Link
          to="/products"
          className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to products
        </Link>
      </div>
    );
  }

  const maxQuantity = Math.min(99, product.stock);

  return (
    <div>
      <Link
        to="/products"
        className="mb-6 inline-block text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        ← Back to products
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {product.images[0] && (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            {product.category.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {product.name}
          </h1>
          <p className="text-sm text-slate-500">by {product.vendor.name}</p>

          <p className="text-3xl font-bold text-slate-900">
            {formatPrice(product.price)}
          </p>

          {product.stock > 0 ? (
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              {product.stock} in stock
            </span>
          ) : (
            <span className="w-fit rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
              Out of stock
            </span>
          )}

          <p className="leading-relaxed text-slate-600">
            {product.description}
          </p>

          {product.stock > 0 && (
            <form
              onSubmit={handleAddToCart}
              className="mt-2 space-y-4 border-t border-slate-200 pt-6"
            >
              <div className="flex items-center gap-3">
                <label
                  htmlFor="quantity"
                  className="text-sm font-medium text-slate-700"
                >
                  Quantity
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-10 w-10 rounded-l-md border border-slate-300 bg-white text-lg text-slate-700 transition-colors hover:bg-slate-100"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    id="quantity"
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                    className="h-10 w-16 border-y border-slate-300 text-center text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(maxQuantity, q + 1))
                    }
                    className="h-10 w-10 rounded-r-md border border-slate-300 bg-white text-lg text-slate-700 transition-colors hover:bg-slate-100"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {adding ? "Adding..." : "Add to cart"}
              </button>

              {cartMessage && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {cartMessage}.{" "}
                  <Link to="/cart" className="font-semibold underline">
                    View cart
                  </Link>
                </p>
              )}
              {cartError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {cartError}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
