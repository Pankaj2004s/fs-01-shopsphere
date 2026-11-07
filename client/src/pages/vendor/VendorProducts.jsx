import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getMyProducts } from "../../api/products";
import Pagination from "../../components/Pagination";
import { useAuth } from "../../hooks/useAuth";
import { formatPrice } from "../../utils/formatPrice";

const addButtonClass =
  "inline-block rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95";

const rowButtonClass =
  "hidden rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:inline-block";

const deleteButtonClass =
  "hidden rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-block";

function VendorProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await getMyProducts({ page }, token);
        if (!cancelled) {
          setProducts(data.products);
          setPagination(data.pagination);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [page, token]);

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      return;
    }

    setActionError("");
    setDeletingId(product._id);

    try {
      await deleteProduct(product._id, token);
      setProducts((current) =>
        current.filter((item) => item._id !== product._id),
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
          My products
        </h1>
        <div className="animate-pulse space-y-3">
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

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          No products yet
        </h1>
        <p className="mt-2 text-slate-500">
          Products you list will show up here.
        </p>
        <Link to="/vendor/products/new" className={`mt-6 ${addButtonClass}`}>
          Add product
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My products
        </h1>
        <Link to="/vendor/products/new" className={addButtonClass}>
          Add product
        </Link>
      </div>

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      <ul className="space-y-3">
        {products.map((product) => (
          <li
            key={product._id}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">
                {product.name}
              </p>
              <p className="text-sm text-slate-500">{product.category.name}</p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <p className="font-bold text-slate-900">
                {formatPrice(product.price)}
              </p>
              {product.stock > 0 ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {product.stock} in stock
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                  Out of stock
                </span>
              )}
            </div>

            <Link to={`/products/${product._id}`} className={rowButtonClass}>
              View
            </Link>
            <Link
              to={`/vendor/products/${product._id}/edit`}
              className={rowButtonClass}
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(product)}
              disabled={deletingId === product._id}
              className={deleteButtonClass}
            >
              {deletingId === product._id ? "Deleting..." : "Delete"}
            </button>
          </li>
        ))}
      </ul>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}

export default VendorProducts;
