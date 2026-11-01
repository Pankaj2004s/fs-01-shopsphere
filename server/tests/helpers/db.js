import mongoose from "mongoose";
import { env } from "../../src/config/env.js";

const assertTestDatabase = () => {
  if (!env.mongoUri.endsWith("_test")) {
    throw new Error("Refusing to run: MONGO_URI must point to a *_test database");
  }
};

export const connectTestDB = async () => {
  assertTestDatabase();
  await mongoose.connect(env.mongoUri);
};

export const clearDB = async () => {
  assertTestDatabase();
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

export const disconnectTestDB = async () => {
  await mongoose.disconnect();
};