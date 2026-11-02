import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct } from "../api/products";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <p>Loading product...</p>;
  }

  if (error) {
    return (
      <div>
        <p role="alert">{error}</p>
        <Link to="/products">Back to products</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/products">Back to products</Link>
      {product.images[0] && (
        <img src={product.images[0]} alt={product.name} width="400" />
      )}
      <h1>{product.name}</h1>
      <p>{priceFormatter.format(product.price)}</p>
      <p>
        {product.category.name} by {product.vendor.name}
      </p>
      <p>{product.description}</p>
      <p>
        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
      </p>
    </div>
  );
}

export default ProductDetail;
