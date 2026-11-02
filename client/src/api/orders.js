import { api } from "./client";

export function placeOrder(token) {
  return api.post("/orders", undefined, { token });
}

export function getOrders(params = {}, token) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return api.get(`/orders${queryString ? `?${queryString}` : ""}`, { token });
}

export function getOrder(id, token) {
  return api.get(`/orders/${id}`, { token });
}

export function cancelOrder(id, token) {
  return api.patch(`/orders/${id}/status`, { status: "cancelled" }, { token });
}
