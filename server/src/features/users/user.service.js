import User from "./user.model.js";
import ApiError from "../../utils/ApiError.js";
import { toUserResponse } from "../auth/auth.service.js";

export const becomeVendor = async (user) => {
  if (user.role === "vendor") {
    throw new ApiError(409, "You are already a vendor");
  }

  if (user.role === "admin") {
    throw new ApiError(400, "Admins cannot become vendors");
  }

  const updated = await User.findOneAndUpdate(
    { _id: user._id, role: "customer" },
    { $set: { role: "vendor" } },
    { returnDocument: "after" },
  );

  if (!updated) {
    throw new ApiError(409, "Your role was changed, please retry");
  }

  return toUserResponse(updated);
};
