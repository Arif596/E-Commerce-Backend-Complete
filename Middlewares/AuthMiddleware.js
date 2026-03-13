const catchAsyncError = require("../Middlewares/catchAsyncError");
const { ErrorHandler } = require("../Middlewares/errorMiddlewares");
const database = require("../Database/db");
const jwt = require("jsonwebtoken");

// const isAuthenticated = catchAsyncError(async (req, res, next) => {
//   const token = req.cookies.adminToken || req.cookies.userToken;
//   console.log("User token", req.userToken);
//   // const { token } = req.cookies;
//   if (!token) {
//     return next(new ErrorHandler("Please Login to access this resource", 401));
//   }
//   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//   const user = await database.query(`SELECT* FROM users WHERE id=$1 LIMIT 1 `, [
//     decoded.id,
//   ]);
//   req.user = user.rows[0];
//   next();
// });
// isAuthenticated.js
const isAuthenticated = catchAsyncError(async (req, res, next) => {
  const origin = req.headers.origin || "";
  let token;
  if (origin.includes("5174")) {
    token = req.cookies.adminToken;
  } else if (origin.includes("5173")) {
    token = req.cookies.userToken;
  } else {
    token = req.cookies.adminToken || req.cookies.userToken;
  }

  if (!token) {
    return next(new ErrorHandler("Please Login to access this resource", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  console.log("✅ Decoded ID:", decoded.id);

  const user = await database.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [
    decoded.id,
  ]);

  if (!user.rows[0]) {
    return next(new ErrorHandler("User not found", 401));
  }

  req.user = user.rows[0];
  next();
});
const authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role ${req.user.role} is not allowed ti access this role`,
          400,
        ),
      );
    }
    next();
  };
};

module.exports = { authorizedRoles, isAuthenticated };
