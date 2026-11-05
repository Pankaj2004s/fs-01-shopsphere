import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api/products";
import { formatPrice } from "../utils/formatPrice";

function Products() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await getProducts({ page });
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
  }, [page]);

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
          Products
        </h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div className="aspect-4/3 bg-slate-200" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
              </div>
            </div>
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
      <p className="py-16 text-center text-slate-500">No products found.</p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        Products
      </h1>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <li key={product._id}>
            <Link
              to={`/products/${product._id}`}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="aspect-4/3 overflow-hidden bg-slate-100">
                {product.images[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                  {product.category.name}
                </p>
                <h2 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-brand-600">
                  {product.name}
                </h2>
                <p className="text-sm text-slate-500">
                  by {product.vendor.name}
                </p>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <p className="text-lg font-bold text-slate-900">
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
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setPage((p) => p - 1)}
          disabled={page <= 1}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= pagination.totalPages}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Products;
