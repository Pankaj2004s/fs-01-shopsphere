import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      MONGO_URI: "mongodb://127.0.0.1:27017/shopsphere_test",
      JWT_SECRET: "test_secret_only_for_automated_tests",
    },
    fileParallelism: false,
  },
});