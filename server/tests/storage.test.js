import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { env } from "../src/config/env.js";
import { saveImage as saveToCloudinary } from "../src/storage/cloudinary.storage.js";
import { saveImage as saveToS3 } from "../src/storage/s3.storage.js";
import { saveImage } from "../src/storage/index.js";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send(command) {
      return sendMock(command);
    }
  },
  PutObjectCommand: class {
    constructor(input) {
      this.input = input;
    }
  },
}));

const png = { buffer: Buffer.from("fake-png-bytes"), mimetype: "image/png" };
const gif = { buffer: Buffer.from("gif"), mimetype: "image/gif" };
const original = { ...env };

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({});
});

afterEach(() => {
  Object.assign(env, original);
  vi.unstubAllGlobals();
});

describe("cloudinary storage adapter", () => {
  const CLOUDINARY_URL = "https://res.cloudinary.com/demo/image/upload/a.png";

  beforeEach(() => {
    env.cloudinaryCloudName = "demo";
    env.cloudinaryApiKey = "test-key";
    env.cloudinaryApiSecret = "test-secret";
  });

  it("uploads a signed form and returns the secure url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: CLOUDINARY_URL }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await saveToCloudinary(png);

    expect(result).toEqual({ url: CLOUDINARY_URL });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(options.method).toBe("POST");

    const form = options.body;
    const timestamp = form.get("timestamp");
    const expected = createHash("sha1")
      .update(`folder=shopsphere&timestamp=${timestamp}test-secret`)
      .digest("hex");
    expect(form.get("signature")).toBe(expected);
    expect(form.get("api_key")).toBe("test-key");
    expect(form.get("folder")).toBe("shopsphere");
  });

  it("never sends the api secret in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: CLOUDINARY_URL }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await saveToCloudinary(png);

    const form = fetchMock.mock.calls[0][1].body;
    expect([...form.values()].every((value) => value !== "test-secret")).toBe(true);
  });

  it("returns 502 when cloudinary rejects the upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: {} }) }),
    );

    await expect(saveToCloudinary(png)).rejects.toMatchObject({ statusCode: 502 });
  });

  it("returns 502 when cloudinary cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(saveToCloudinary(png)).rejects.toMatchObject({ statusCode: 502 });
  });

  it("returns 503 and does not call fetch when it is not configured", async () => {
    env.cloudinaryApiSecret = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveToCloudinary(png)).rejects.toMatchObject({ statusCode: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a file type that is not allowed", async () => {
    await expect(saveToCloudinary(gif)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("s3 storage adapter", () => {
  beforeEach(() => {
    env.s3Bucket = "my-bucket";
    env.s3Region = "ap-south-1";
    env.s3PublicUrl = "";
  });

  it("puts the image in the bucket and returns the s3 url", async () => {
    const { url } = await saveToS3(png);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const input = sendMock.mock.calls[0][0].input;
    expect(input.Bucket).toBe("my-bucket");
    expect(input.Key).toMatch(/^shopsphere\/[0-9a-f-]{36}\.png$/);
    expect(input.ContentType).toBe("image/png");
    expect(input.Body).toBe(png.buffer);
    expect(url).toBe(`https://my-bucket.s3.ap-south-1.amazonaws.com/${input.Key}`);
  });

  it("uses the public url when one is configured", async () => {
    env.s3PublicUrl = "https://cdn.example.com/";

    const { url } = await saveToS3(png);

    const key = sendMock.mock.calls[0][0].input.Key;
    expect(url).toBe(`https://cdn.example.com/${key}`);
  });

  it("returns 502 when s3 rejects the upload", async () => {
    sendMock.mockRejectedValue(new Error("AccessDenied"));

    await expect(saveToS3(png)).rejects.toMatchObject({ statusCode: 502 });
  });

  it("returns 503 and does not call s3 when it is not configured", async () => {
    env.s3Bucket = "";

    await expect(saveToS3(png)).rejects.toMatchObject({ statusCode: 503 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a file type that is not allowed", async () => {
    await expect(saveToS3(gif)).rejects.toMatchObject({ statusCode: 400 });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("storage selector", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "shopsphere-storage-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("uses the local adapter when the driver is local", async () => {
    env.storageDriver = "local";
    env.uploadDir = tempDir;

    const { url } = await saveImage(png);

    expect(url).toMatch(new RegExp(`^${env.serverUrl}/uploads/[0-9a-f-]{36}\\.png$`));
    expect(await fs.readdir(tempDir)).toHaveLength(1);
  });

  it("uses the cloudinary adapter when the driver is cloudinary", async () => {
    env.storageDriver = "cloudinary";
    env.cloudinaryCloudName = "";

    await expect(saveImage(png)).rejects.toThrow("Cloudinary storage is not configured");
  });

  it("uses the s3 adapter when the driver is s3", async () => {
    env.storageDriver = "s3";
    env.s3Bucket = "";

    await expect(saveImage(png)).rejects.toThrow("S3 storage is not configured");
  });

  it("returns 500 for an unknown driver", async () => {
    env.storageDriver = "bogus";

    await expect(saveImage(png)).rejects.toMatchObject({ statusCode: 500 });
  });
});
