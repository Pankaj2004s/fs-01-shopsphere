import { useEffect, useState } from "react";
import { getProducts } from "../api/products";
import Pagination from "../components/Pagination";
import ProductCard from "../components/ProductCard";

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
        <div className="grid animate-pulse grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
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
            <ProductCard product={product} />
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

export default Products;
