import { Link } from "react-router-dom";
import { formatPrice } from "../utils/formatPrice";

function ProductCard({ product }) {
  return (
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
        <p className="text-sm text-slate-500">by {product.vendor.name}</p>

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
  );
}

export default ProductCard;
