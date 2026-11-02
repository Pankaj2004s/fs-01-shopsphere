import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addToCart } from "../api/cart";
import { getProduct } from "../api/products";
import { useAuth } from "../hooks/useAuth";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

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
      <p>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>

      {product.stock > 0 && (
        <form onSubmit={handleAddToCart}>
          <label htmlFor="quantity">Quantity</label>{" "}
          <input
            id="quantity"
            type="number"
            min={1}
            max={Math.min(99, product.stock)}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />{" "}
          <button type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add to cart"}
          </button>
          {cartMessage && <p>{cartMessage}</p>}
          {cartError && <p role="alert">{cartError}</p>}
        </form>
      )}
    </div>
  );
}

export default ProductDetail;
