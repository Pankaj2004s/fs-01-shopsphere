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
