import ApiError from "../utils/ApiError.js";

const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      return next(new ApiError(400, message));
    }

    if (source === "body") {
      req.body = result.data;
    } else {
      req.validated = { ...req.validated, [source]: result.data };
    }

    next();
  };

export default validate;
