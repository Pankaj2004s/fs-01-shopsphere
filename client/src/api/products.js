import { api } from "./client";

export function getProducts(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return api.get(`/products${queryString ? `?${queryString}` : ""}`);
}

export function getProduct(id) {
  return api.get(`/products/${id}`);
}
