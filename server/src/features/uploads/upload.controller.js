import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { saveImage } from "../../storage/local.storage.js";

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  const { url } = await saveImage(req.file);
  res.status(201).json({ url });
});
