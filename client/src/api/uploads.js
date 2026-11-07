import { api } from "./client";

export function uploadImage(file, token) {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/uploads/images", formData, { token });
}
