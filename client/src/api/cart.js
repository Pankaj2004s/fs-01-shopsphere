import { api } from "./client";

export function getCart(token) {
  return api.get("/cart", { token });
}

export function addToCart(productId, quantity, token) {
  return api.post("/cart/items", { productId, quantity }, { token });
}

export function updateCartItem(productId, quantity, token) {
  return api.patch(`/cart/items/${productId}`, { quantity }, { token });
}

export function removeCartItem(productId, token) {
  return api.delete(`/cart/items/${productId}`, { token });
}
