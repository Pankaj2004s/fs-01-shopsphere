import { createClient } from "redis";
import { env } from "./env.js";

export const redis = createClient({
  url: env.redisUrl,
  disableOfflineQueue: true,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

export function connectRedis() {
  if (redis.isOpen) return Promise.resolve();
  return redis.connect().catch((err) => {
    console.error("Redis connect failed:", err.message);
  });
}

export function isRedisReady() {
  return redis.isReady;
}

export async function disconnectRedis() {
  if (redis.isOpen) await redis.close();
}
