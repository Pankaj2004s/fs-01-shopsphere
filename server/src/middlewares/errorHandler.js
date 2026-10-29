export function errorHandler(err, req, res, next) {
    const status = err.statusCode || 500;
    console.error(err);
    res.status(status).json({ message: err.message || "Server error" });
}