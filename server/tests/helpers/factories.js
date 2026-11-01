import User from "../../src/features/users/user.model.js";
import { signToken } from "../../src/utils/token.js";

let counter = 0;

export const createUser = async (overrides = {}) => {
  counter += 1;

  const data = {
    name: "Test User",
    email: `user${counter}@test.dev`,
    password: "password123",
    role: "customer",
    ...overrides,
  };

  const user = await User.create(data);
  const token = signToken(user._id.toString());

  return { user, token, password: data.password };
};