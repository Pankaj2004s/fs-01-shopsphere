import User from "../users/user.model.js";
import ApiError from "../../utils/ApiError.js";
import { signToken } from "../../utils/token.js";

export const toUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user._id.toString());

  return { user: toUserResponse(user), token };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken(user._id.toString());

  return { user: toUserResponse(user), token };
};
