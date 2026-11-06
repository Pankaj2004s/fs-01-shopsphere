import multer from "multer";
import ApiError from "../utils/ApiError.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, "Only JPEG, PNG or WebP images are allowed"));
    }
    cb(null, true);
  },
});

export const uploadImage = upload.single("image");
