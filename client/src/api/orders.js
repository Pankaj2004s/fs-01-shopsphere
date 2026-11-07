import { api } from "./client";
import { buildQuery } from "../utils/buildQuery";

export function placeOrder(token) {
  return api.post("/orders", undefined, { token });
}

export function getOrders(params = {}, token) {
  return api.get(`/orders${buildQuery(params)}`, { token });
}

export function getVendorOrders(params = {}, token) {
  return api.get(`/orders/vendor${buildQuery(params)}`, { token });
}

export function getOrder(id, token) {
  return api.get(`/orders/${id}`, { token });
}

export function updateOrderStatus(id, status, token) {
  return api.patch(`/orders/${id}/status`, { status }, { token });
}

export function cancelOrder(id, token) {
  return updateOrderStatus(id, "cancelled", token);
}
