import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { getProducts } from "../api/products";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  {
    title: "Independent vendors",
    text: "Browse products from different sellers in one marketplace.",
  },
  {
    title: "Live stock",
    text: "See what is in stock before you add it to your cart.",
  },
  {
    title: "Flexible orders",
    text: "Cancel a pending or confirmed order and the stock goes back.",
  },
];

function Home() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState("checking...");
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await api.get("/health");
        setStatus(data.status);
      } catch (err) {
        setStatus(err.message);
      }
    }

    checkHealth();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFeatured() {
      try {
        const data = await getProducts({ limit: 4 });
        if (!cancelled) setFeatured(data.products);
      } catch {
        // the home page still works without featured products
      } finally {
        if (!cancelled) setLoadingFeatured(false);
      }
    }

    loadFeatured();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-16">
      <section className="rounded-3xl bg-linear-to-br from-brand-600 to-brand-700 px-6 py-14 text-white sm:px-12 sm:py-20">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Shop from independent vendors, all in one place.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-brand-100">
          Discover books, electronics and fashion from sellers across
          ShopSphere.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/products"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-brand-50 active:scale-95"
          >
            Browse products
          </Link>
          {!loading &&
            (user ? (
              <Link
                to="/orders"
                className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10 active:scale-95"
              >
                View my orders
              </Link>
            ) : (
              <Link
                to="/register"
                className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10 active:scale-95"
              >
                Create account
              </Link>
            ))}
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 font-bold text-brand-600">
              {index + 1}
            </div>
            <h2 className="mt-4 font-semibold text-slate-900">
              {feature.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{feature.text}</p>
          </div>
        ))}
      </section>

      {(loadingFeatured || featured.length > 0) && (
        <section>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Featured products
            </h2>
            <Link
              to="/products"
              className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              View all →
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid animate-pulse grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="aspect-[4/3] bg-slate-200" />
                  <div className="space-y-3 p-4">
                    <div className="h-3 w-1/3 rounded bg-slate-200" />
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
                <li key={product._id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <span
          className={`h-2 w-2 rounded-full ${
            status === "ok" ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
        API status: {status}
      </p>
    </div>
  );
}

export default Home;
