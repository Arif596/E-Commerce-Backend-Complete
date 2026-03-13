class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorMiddleware = (err, req, res, next) => {
  err.message = err.message || "Internal Server Error";
  err.statusCode = err.statusCode || 500;
  // MongoDB duplicate key error
  if (err.code === 11000) {
    err = new ErrorHandler("Duplicate field entered", 400);
  }
  // JWT invalid token
  if (err.name === "JsonWebTokenError") {
    err = new ErrorHandler("Invalid JSON Web Token, try again", 401);
  }
  // JWT expired
  if (err.name === "TokenExpiredError") {
    err = new ErrorHandler("JSON Web Token has expired, try again", 401);
  }
  // Validation errors (Mongoose)
  let errorMessage = "";
  if (err.errors) {
    errorMessage = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }
  return res.status(err.statusCode).json({
    success: false,
    message: errorMessage || err.message,
  });
};

module.exports = {
  ErrorHandler,
  errorMiddleware,
};
