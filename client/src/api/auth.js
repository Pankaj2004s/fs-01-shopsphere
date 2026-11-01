import { api } from "./client";

export function register(data) {
  return api.post("/auth/register", data);
}

export function login(data) {
  return api.post("/auth/login", data);
}

export function getMe(token) {
  return api.get("/auth/me", { token });
}
