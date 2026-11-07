import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { env } from "../src/config/env.js";
import {
  redis,
  connectRedis,
  disconnectRedis,
  isRedisReady,
} from "../src/config/redis.js";
import { getOrSet, invalidate } from "../src/utils/cache.js";

const isTestDb = () => env.redisUrl.endsWith("/1");

const makeLoader = (value = { ok: true }) => vi.fn(async () => value);

describe("cache helper", () => {
  beforeAll(async () => {
    if (!isTestDb()) {
      throw new Error("Refusing to run: REDIS_URL must use database 1");
    }
    await connectRedis();
    expect(isRedisReady()).toBe(true);
  });

  beforeEach(async () => {
    await redis.flushDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (isTestDb() && isRedisReady()) {
      await redis.flushDb();
    }
    await disconnectRedis();
  });

  it("calls the loader on a miss and serves the next call from cache", async () => {
    const loader = makeLoader({ n: 1 });

    const first = await getOrSet("t", { page: 1 }, 30, loader);
    const second = await getOrSet("t", { page: 1 }, 30, loader);

    expect(first).toEqual({ n: 1 });
    expect(second).toEqual({ n: 1 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("keeps a separate entry for different params", async () => {
    const loader = makeLoader();

    await getOrSet("t", { page: 1 }, 30, loader);
    await getOrSet("t", { page: 2 }, 30, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("builds the same key whatever the order of the params", async () => {
    const loader = makeLoader();

    await getOrSet("t", { a: 1, b: 2 }, 30, loader);
    await getOrSet("t", { b: 2, a: 1 }, 30, loader);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("calls the loader again after invalidate", async () => {
    const loader = makeLoader();

    await getOrSet("t", {}, 30, loader);
    await invalidate("t");
    await getOrSet("t", {}, 30, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("stores the entry with a TTL", async () => {
    await getOrSet("ttltest", {}, 30, makeLoader());

    const [key] = await redis.keys("cache:ttltest:v0:*");
    const ttl = await redis.ttl(key);

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(30);
  });

  it("passes loader errors on and does not cache them", async () => {
    const failing = vi.fn(async () => {
      throw new Error("db down");
    });

    await expect(getOrSet("errtest", {}, 30, failing)).rejects.toThrow(
      "db down",
    );

    const working = makeLoader({ n: 1 });
    const result = await getOrSet("errtest", {}, 30, working);

    expect(result).toEqual({ n: 1 });
    expect(working).toHaveBeenCalledTimes(1);
  });

  it("falls back to the loader when a cache read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(redis, "get").mockRejectedValue(new Error("redis down"));
    const loader = makeLoader({ n: 7 });

    const result = await getOrSet("falltest", {}, 30, loader);

    expect(result).toEqual({ n: 7 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("still returns the value when a cache write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(redis, "set").mockRejectedValue(new Error("redis down"));
    const loader = makeLoader({ n: 9 });

    const result = await getOrSet("writetest", {}, 30, loader);

    expect(result).toEqual({ n: 9 });
  });

  it("does not throw when invalidate fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(redis, "incr").mockRejectedValue(new Error("redis down"));

    await expect(invalidate("t")).resolves.toBeUndefined();
  });
});
