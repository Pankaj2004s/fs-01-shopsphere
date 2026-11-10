import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { getImageExtension } from "./imageTypes.js";

export const saveImage = async ({ buffer, mimetype }) => {
  const extension = getImageExtension(mimetype);

  const dir = path.resolve(env.uploadDir);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  await fs.writeFile(path.join(dir, filename), buffer);

  return { url: `${env.serverUrl}/uploads/${filename}` };
};
