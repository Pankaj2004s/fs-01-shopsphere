import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts } from "../api/products";
import Pagination from "../components/Pagination";
import ProductCard from "../components/ProductCard";
import ProductFilters from "../components/ProductFilters";

const QUERY_KEYS = ["search", "category", "minPrice", "maxPrice", "sort", "page"];
const DEFAULT_SORT = "newest";

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState({
    key: null,
    products: [],
    pagination: null,
    error: "",
  });

  const queryString = searchParams.toString();
  const values = {
    search: searchParams.get("search") ?? "",
    category: searchParams.get("category") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    sort: searchParams.get("sort") ?? DEFAULT_SORT,
  };
  const hasFilters =
    Boolean(
      values.search || values.category || values.minPrice || values.maxPrice,
    ) || values.sort !== DEFAULT_SORT;
  const loading = result.key !== queryString;

  useEffect(() => {
    let cancelled = false;
    const current = new URLSearchParams(queryString);
    const params = {};

    for (const key of QUERY_KEYS) {
      if (current.has(key)) params[key] = current.get(key);
    }

    async function loadProducts() {
      try {
        const data = await getProducts(params);
        if (!cancelled) {
          setResult({
            key: queryString,
            products: data.products,
            pagination: data.pagination,
            error: "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setResult({
            key: queryString,
            products: [],
            pagination: null,
            error: err.message,
          });
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  function updateFilters(changes) {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    for (const [key, value] of Object.entries(changes)) {
      const normalized =
        key === "sort" && value === DEFAULT_SORT ? "" : String(value);

      if ((next.get(key) ?? "") === normalized) continue;

      changed = true;
      if (normalized === "") {
        next.delete(key);
      } else {
        next.set(key, normalized);
      }
    }

    if (!changed) return;

    next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  function changePage(page) {
    const next = new URLSearchParams(searchParams);

    if (page === 1) {
      next.delete("page");
    } else {
      next.set("page", String(page));
    }

    setSearchParams(next);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        Products
      </h1>

      <ProductFilters
        values={values}
        onChange={updateFilters}
        onClear={clearFilters}
        hasFilters={hasFilters}
      />

      {loading ? (
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
      ) : result.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {result.error}
        </p>
      ) : result.products.length === 0 ? (
        <p className="py-16 text-center text-slate-500">
          {hasFilters
            ? "No products match your filters."
            : "No products found."}
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.products.map((product) => (
              <li key={product._id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>

          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            onPageChange={changePage}
          />
        </>
      )}
    </div>
  );
}

export default Products;
