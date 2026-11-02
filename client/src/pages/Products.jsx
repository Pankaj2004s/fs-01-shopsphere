import { useEffect, useState } from "react";
import { getProducts } from "../api/products";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

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
    return <p>Loading products...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (products.length === 0) {
    return <p>No products found.</p>;
  }

  return (
    <div>
      <h1>Products</h1>
      <ul>
        {products.map((product) => (
          <li key={product._id}>
            {product.images[0] && (
              <img src={product.images[0]} alt={product.name} width="200" />
            )}
            <h2>{product.name}</h2>
            <p>{priceFormatter.format(product.price)}</p>
            <p>
              {product.category.name} by {product.vendor.name}
            </p>
            <p>
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </p>
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

export default Products;
