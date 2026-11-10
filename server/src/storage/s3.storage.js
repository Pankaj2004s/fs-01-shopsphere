import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import { getImageExtension } from "./imageTypes.js";

const PREFIX = "shopsphere";

let client;

const getClient = () => {
  if (!client) {
    client = new S3Client({ region: env.s3Region });
  }

  return client;
};

export const saveImage = async ({ buffer, mimetype }) => {
  const extension = getImageExtension(mimetype);

  if (!env.s3Bucket || !env.s3Region) {
    throw new ApiError(503, "S3 storage is not configured");
  }

  const key = `${PREFIX}/${randomUUID()}${extension}`;

  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch {
    throw new ApiError(502, "Image storage service rejected the upload");
  }

  const base = env.s3PublicUrl
    ? env.s3PublicUrl.replace(/\/+$/, "")
    : `https://${env.s3Bucket}.s3.${env.s3Region}.amazonaws.com`;

  return { url: `${base}/${key}` };
};
