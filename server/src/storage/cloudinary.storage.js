import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import { getImageExtension } from "./imageTypes.js";

const FOLDER = "shopsphere";

const sign = (params) => {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(toSign + env.cloudinaryApiSecret)
    .digest("hex");
};

export const saveImage = async ({ buffer, mimetype }) => {
  getImageExtension(mimetype);

  if (
    !env.cloudinaryCloudName ||
    !env.cloudinaryApiKey ||
    !env.cloudinaryApiSecret
  ) {
    throw new ApiError(503, "Cloudinary storage is not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ folder: FOLDER, timestamp });

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimetype }), "upload");
  form.append("api_key", env.cloudinaryApiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", FOLDER);
  form.append("signature", signature);

  let response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`,
      { method: "POST", body: form, signal: AbortSignal.timeout(15000) },
    );
  } catch {
    throw new ApiError(502, "Image storage service is unreachable");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.secure_url) {
    throw new ApiError(502, "Image storage service rejected the upload");
  }

  return { url: data.secure_url };
};
