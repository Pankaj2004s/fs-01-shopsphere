import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCategories } from "../../api/categories";
import { createProduct, getProduct, updateProduct } from "../../api/products";
import { uploadImage } from "../../api/uploads";
import { useAuth } from "../../hooks/useAuth";

const MAX_IMAGES = 5;

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const data = await getCategories();
        if (!cancelled) setCategories(data.categories);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadProduct() {
      try {
        const data = await getProduct(id);
        if (cancelled) return;
        const product = data.product;
        setName(product.name);
        setDescription(product.description);
        setPrice(String(product.price));
        setStock(String(product.stock));
        setCategory(product.category._id);
        setImages(product.images);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleFileChange(e) {
    const files = Array.from(e.target.files).slice(0, MAX_IMAGES - images.length);
    e.target.value = "";

    if (files.length === 0) return;

    setError("");
    setUploading(true);

    try {
      const uploaded = [];
      for (const file of files) {
        const data = await uploadImage(file, token);
        uploaded.push(data.url);
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage(url) {
    setImages((current) => current.filter((item) => item !== url));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      category,
      images,
    };

    try {
      if (isEdit) {
        await updateProduct(id, payload, token);
      } else {
        await createProduct(payload, token);
      }
      navigate("/vendor/products");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (productLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded bg-slate-200" />
        <div className="h-96 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {loadError}
        </p>
        <Link
          to="/vendor/products"
          className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to my products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        to="/vendor/products"
        className="mb-6 inline-block text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        ← Back to my products
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Edit product" : "Add a product"}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-slate-700"
              >
                Price (INR)
              </label>
              <input
                id="price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="stock"
                className="block text-sm font-medium text-slate-700"
              >
                Stock
              </label>
              <input
                id="stock"
                type="number"
                min={0}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-slate-700"
            >
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={categoriesLoading}
              className={inputClass}
              required
            >
              <option value="">
                {categoriesLoading ? "Loading..." : "Select a category"}
              </option>
              {categories.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="images"
              className="block text-sm font-medium text-slate-700"
            >
              Images (up to {MAX_IMAGES}, JPEG, PNG or WebP, max 5 MB each)
            </label>
            <input
              id="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              disabled={uploading || images.length >= MAX_IMAGES}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-60"
            />
            {uploading && (
              <p className="mt-2 text-sm text-slate-500">Uploading...</p>
            )}
            {images.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {images.map((url) => (
                  <li key={url} className="relative">
                    <img
                      src={url}
                      alt="Product preview"
                      className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(url)}
                      aria-label="Remove image"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-xs font-bold text-white shadow hover:bg-red-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save product"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;
