import { useEffect, useState } from "react";
import { getProducts } from "../api/products";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await getProducts();
        if (!cancelled) setProducts(data.products);
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
  }, []);

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
    </div>
  );
}

export default Products;
