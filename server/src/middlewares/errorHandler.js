import { env } from "../config/env.js";

const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500;
    const isOperational = err.isOperational === true;

    console.error(err);

    const message = isOperational || env.nodeEnv !== "production" ? err.message || "Server Error" : "Something Went Wrong";

    res.status(status).json({ message });
};

export default errorHandler;