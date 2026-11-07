import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";

export function createLimiter({
  name,
  windowMs,
  limit,
  message,
  enabledInTest = false,
}) {
  const useRedis = env.nodeEnv !== "test";

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    message: { message: message || "Too many requests, please try again later" },
    skip: () => env.nodeEnv === "test" && !enabledInTest,
    ...(useRedis && {
      store: new RedisStore({
        prefix: `rl:${name}:`,
        sendCommand: (...args) => redis.sendCommand(args),
      }),
    }),
  });
}
