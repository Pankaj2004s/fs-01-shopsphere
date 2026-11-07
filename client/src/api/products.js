import { api } from "./client";
import { buildQuery } from "../utils/buildQuery";

export function getProducts(params = {}) {
  return api.get(`/products${buildQuery(params)}`);
}

export function getMyProducts(params = {}, token) {
  return api.get(`/products/mine${buildQuery(params)}`, { token });
}

export function getProduct(id) {
  return api.get(`/products/${id}`);
}

export function createProduct(data, token) {
  return api.post("/products", data, { token });
}

export function updateProduct(id, data, token) {
  return api.patch(`/products/${id}`, data, { token });
}

export function deleteProduct(id, token) {
  return api.delete(`/products/${id}`, { token });
}
