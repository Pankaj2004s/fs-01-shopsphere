import asyncHandler from "../../utils/asyncHandler.js";
import { registerUser, loginUser, toUserResponse } from "./auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await registerUser(req.body);
  res.status(201).json({ user, token });
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await loginUser(req.body);
  res.status(200).json({ user, token });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ user: toUserResponse(req.user) });
});
