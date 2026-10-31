import { env } from "../config/env.js";

const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message;
  let isOperational = err.isOperational === true;

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field ? `${field} already exists` : "Duplicate value";
    isOperational = true;
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    isOperational = true;
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    isOperational = true;
  }

  console.error(err);

  const clientMessage =
    isOperational || env.nodeEnv !== "production"
      ? message || "Server Error"
      : "Something Went Wrong";

  res.status(status).json({ message: clientMessage });
};

export default errorHandler;
