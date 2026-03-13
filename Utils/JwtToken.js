const jwt = require("jsonwebtoken");
const sendToken = (user, statusCode, message, res) => {
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  const cookiesName = user.role === "Admin" ? "adminToken" : "userToken";
  res
    .status(statusCode)
    .cookie(cookiesName, token, {
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
      ),
      httpOnly: true,
    })
    .json({
      success: true,
      user,
      token,
      message,
    });
};
module.exports = sendToken;
