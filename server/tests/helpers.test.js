import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import User from "../src/features/users/user.model.js";
import { verifyToken } from "../src/utils/token.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";

describe("test helpers", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  it("createUser saves a hashed user and returns a valid token", async () => {
    const { user, token, password } = await createUser({ role: "vendor" });

    const saved = await User.findById(user._id).select("+password");

    expect(saved.role).toBe("vendor");
    expect(saved.password).not.toBe(password);
    expect(verifyToken(token).id).toBe(user._id.toString());
  });

  it("clearDB empties collections between tests", async () => {
    expect(await User.countDocuments()).toBe(0);
  });
});