import dotenv from "dotenv";
dotenv.config({ quiet: true });

const required = ["MONGO_URI", "JWT_SECRET"];

if (process.env.NODE_ENV === "production") {
  required.push("CLIENT_URL");
}

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  clientUrl: process.env.CLIENT_URL,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || "http://127.0.0.1:9200",
  searchEngine: process.env.SEARCH_ENGINE || "elasticsearch",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  storageDriver: process.env.STORAGE_DRIVER || "local",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  s3Bucket: process.env.S3_BUCKET || "",
  s3Region: process.env.S3_REGION || "",
  s3PublicUrl: process.env.S3_PUBLIC_URL || "",
};
