import dotenv from "dotenv";
dotenv.config({ quiet: true });

const required = ["MONGO_URI", "JWT_SECRET"];

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
};
