import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import errorHandler from "../src/middlewares/errorHandler.js";
import { env } from "../src/config/env.js";

const makeRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const run = (err) => {
  const res = makeRes();
  errorHandler(err, {}, res, () => {});
  return res;
};

describe("errorHandler", () => {
  const originalNodeEnv = env.nodeEnv;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    env.nodeEnv = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("uses the status and message of an operational error", () => {
    const res = run({ statusCode: 404, isOperational: true, message: "Nope" });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Nope" });
  });

  it("maps a Mongo duplicate key error to 409 with the field name", () => {
    const res = run({ code: 11000, keyPattern: { email: 1 } });

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "email already exists" });
  });

  it("uses a generic message when the duplicate key field is unknown", () => {
    const res = run({ code: 11000 });

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Duplicate value" });
  });

  it("maps a Mongoose ValidationError to 400 and joins the messages", () => {
    const res = run({
      name: "ValidationError",
      errors: { a: { message: "A is bad" }, b: { message: "B is bad" } },
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "A is bad, B is bad" });
  });

  it("maps a CastError to 400 with the path and value", () => {
    const res = run({ name: "CastError", path: "_id", value: "abc" });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid _id: abc" });
  });

  it("returns 500 with the real message outside production", () => {
    const res = run(new Error("Database exploded"));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Database exploded" });
  });

  it("falls back to Server Error when the message is empty", () => {
    const res = run(new Error(""));

    expect(res.json).toHaveBeenCalledWith({ message: "Server Error" });
  });

  it("hides the message of an unexpected error in production", () => {
    env.nodeEnv = "production";

    const res = run(new Error("secret internal detail"));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Something Went Wrong" });
    expect(console.error).toHaveBeenCalled();
  });

  it("still shows the message of an operational error in production", () => {
    env.nodeEnv = "production";

    const res = run({ statusCode: 403, isOperational: true, message: "Forbidden" });

    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });
});