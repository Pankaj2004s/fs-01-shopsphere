import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import ApiError from "../utils/ApiError.js";

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const saveImage = async ({ buffer, mimetype }) => {
  const extension = EXTENSIONS[mimetype];

  if (!extension) {
    throw new ApiError(400, "Only JPEG, PNG or WebP images are allowed");
  }

  const dir = path.resolve(env.uploadDir);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  await fs.writeFile(path.join(dir, filename), buffer);

  return { url: `${env.serverUrl}/uploads/${filename}` };
};
