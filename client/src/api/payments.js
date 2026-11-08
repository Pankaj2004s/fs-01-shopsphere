import { api } from "./client";

export function startPayment(orderId, token) {
  return api.post(`/orders/${orderId}/pay`, undefined, { token });
}

export function confirmPayment(orderId, data, token) {
  return api.post(`/orders/${orderId}/pay/confirm`, data, { token });
}
