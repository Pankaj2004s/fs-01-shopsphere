import asyncHandler from "../../utils/asyncHandler.js";
import * as userService from "./user.service.js";

export const becomeVendor = asyncHandler(async (req, res) => {
  const user = await userService.becomeVendor(req.user);
  res.status(200).json({ user });
});
