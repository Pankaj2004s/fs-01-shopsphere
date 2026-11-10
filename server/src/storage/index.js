import { env } from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import * as local from "./local.storage.js";
import * as cloudinary from "./cloudinary.storage.js";
import * as s3 from "./s3.storage.js";

const ADAPTERS = { local, cloudinary, s3 };

export const saveImage = async (file) => {
  if (!Object.hasOwn(ADAPTERS, env.storageDriver)) {
    throw new ApiError(500, `Unknown STORAGE_DRIVER: ${env.storageDriver}`);
  }

  return ADAPTERS[env.storageDriver].saveImage(file);
};
