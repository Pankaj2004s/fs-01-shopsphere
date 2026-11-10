import ApiError from "../utils/ApiError.js";

export const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(IMAGE_EXTENSIONS);

export const getImageExtension = (mimetype) => {
  if (!Object.hasOwn(IMAGE_EXTENSIONS, mimetype)) {
    throw new ApiError(400, "Only JPEG, PNG or WebP images are allowed");
  }

  return IMAGE_EXTENSIONS[mimetype];
};
