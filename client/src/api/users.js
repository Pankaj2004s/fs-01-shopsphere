import { api } from "./client";

export function becomeVendor(token) {
  return api.post("/users/become-vendor", undefined, { token });
}
