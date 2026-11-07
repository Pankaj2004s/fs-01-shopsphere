import { redis, isRedisReady } from "../config/redis.js";

const PREFIX = "cache:";

const versionKey = (namespace) => `${PREFIX}${namespace}:version`;

function stableStringify(value) {
  return JSON.stringify(value, (key, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(
          Object.entries(val).sort(([a], [b]) => a.localeCompare(b)),
        )
      : val,
  );
}

export async function getOrSet(namespace, params, ttlSeconds, loader) {
  if (!isRedisReady()) return loader();

  let key;
  try {
    const version = (await redis.get(versionKey(namespace))) ?? "0";
    key = `${PREFIX}${namespace}:v${version}:${stableStringify(params)}`;
    const cached = await redis.get(key);
    if (cached !== null) return JSON.parse(cached);
  } catch (err) {
    console.error("Cache read failed:", err.message);
    return loader();
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error("Cache write failed:", err.message);
  }

  return value;
}

export async function invalidate(namespace) {
  if (!isRedisReady()) return;
  try {
    await redis.incr(versionKey(namespace));
  } catch (err) {
    console.error("Cache invalidate failed:", err.message);
  }
}
