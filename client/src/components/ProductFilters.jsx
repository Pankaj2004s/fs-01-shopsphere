import { useEffect, useRef, useState } from "react";
import { getCategories } from "../api/categories";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";
const labelClass = "mb-1 block text-xs font-medium text-slate-600";

function ProductFilters({ values, onChange, onClear, hasFilters }) {
  const [categories, setCategories] = useState([]);
  const [draft, setDraft] = useState({
    search: values.search,
    minPrice: values.minPrice,
    maxPrice: values.maxPrice,
  });
  const debouncedDraft = useDebouncedValue(draft);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    onChangeRef.current(debouncedDraft);
  }, [debouncedDraft]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const data = await getCategories();
        if (!cancelled) setCategories(data.categories);
      } catch {
        // the filters still work without the category list
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleClear() {
    setDraft({ search: "", minPrice: "", maxPrice: "" });
    onClear();
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="filter-search" className={labelClass}>
            Search
          </label>
          <input
            id="filter-search"
            type="search"
            value={draft.search}
            onChange={(event) => updateDraft("search", event.target.value)}
            placeholder="Search products"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="filter-category" className={labelClass}>
            Category
          </label>
          <select
            id="filter-category"
            value={values.category}
            onChange={(event) => onChange({ category: event.target.value })}
            className={fieldClass}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-sort" className={labelClass}>
            Sort by
          </label>
          <select
            id="filter-sort"
            value={values.sort}
            onChange={(event) => onChange({ sort: event.target.value })}
            className={fieldClass}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="filter-min-price" className={labelClass}>
              Min price
            </label>
            <input
              id="filter-min-price"
              type="number"
              min="0"
              value={draft.minPrice}
              onChange={(event) => updateDraft("minPrice", event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="filter-max-price" className={labelClass}>
              Max price
            </label>
            <input
              id="filter-max-price"
              type="number"
              min="0"
              value={draft.maxPrice}
              onChange={(event) => updateDraft("maxPrice", event.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-4 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export default ProductFilters;
