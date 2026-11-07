import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      MONGO_URI: "mongodb://127.0.0.1:27017/shopsphere_test",
      JWT_SECRET: "test_secret_only_for_automated_tests",
      UPLOAD_DIR: path.join(os.tmpdir(), "shopsphere-test-uploads"),
      REDIS_URL: "redis://127.0.0.1:6379/1",
    },
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/server.js", "src/scripts/**"],
      reporter: ["text", "html"],
    },
  },
});
