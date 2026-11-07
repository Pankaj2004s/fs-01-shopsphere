import { api } from "./client";

export function getCategories() {
  return api.get("/categories");
}
