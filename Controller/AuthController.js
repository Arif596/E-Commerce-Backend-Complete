const database = require("../Database/db");
const catchAsyncError = require("../Middlewares/catchAsyncError");
const { ErrorHandler } = require("../Middlewares/errorMiddlewares");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const sendToken = require("../Utils/JwtToken");
const FetchAllUser = require("../Utils/userService");
const generateForgetPassTemp = require("../Utils/generateForgotPasswordEmailTemplate");
const generateResetPasswordToken = require("../Utils/generateResetPasswordToken");
const sendEmail = require("../Utils/sendEmail");
const register = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const isAlreadyUser = await database.query(
    `SELECT * FROM users WHERE email = $1`,
    [email],
  );

  if (isAlreadyUser.rows.length > 0) {
    return next(new ErrorHandler("User already registered", 400));
  }
  const hashPassword = await bcrypt.hash(password, 10);
  const user = await database.query(
    "INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING *",
    [name, email, hashPassword],
  );

  sendToken(user.rows[0], 201, "User Created Successfully", res);
});
const Login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("please provide email and password", 400));
  }
  const user = await database.query(`SELECT* FROM users WHERE email=$1`, [
    email,
  ]);
  if (user.rows.length === 0) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }
  const isPasswordMatch = await bcrypt.compare(password, user.rows[0].password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }
  sendToken(user.rows[0], 200, "Loggoed In Successfully", res);
});
const GetUsers = catchAsyncError(async (req, res, next) => {
  const { user } = req;
  res.status(200).json({ success: true, user });
});
const getAllUser = catchAsyncError(async (req, res, next) => {
  const user = await FetchAllUser();
  res.status(200).json({
    success: true,
    user,
  });
});
// const Logout = catchAsyncError(async (req, res, next) => {
//   const cookieName = req.user.role === "Admin" ? "adminToken" : "userToken";
//   res
//     .status(200)
//     .cookie(cookieName, null, {
//       expires: new Date(Date.now()),
//       httpOnly: true,
//     })

//     .json({
//       success: true,
//       message: "Logout Successfully",
//     });
// });
// ✅ FIXED - origin ke hisaab se sirf wahi cookie clear karo
const Logout = catchAsyncError(async (req, res, next) => {
  const origin = req.headers.origin || "";

  // Dashboard logout = sirf adminToken clear karo
  const cookieName = origin.includes("5174") ? "adminToken" : "userToken";

  console.log("🚪 Logout - clearing cookie:", cookieName);

  res
    .status(200)
    .cookie(cookieName, null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({ success: true, message: "Logout Successfully" });
});
const forgotPassword = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const result = await database.query(`SELECT * FROM users WHERE email=$1`, [
    email,
  ]);

  if (result.rows.length === 0) {
    return next(
      new ErrorHandler("If account exists, reset link has been sent.", 200),
    );
  }

  const user = result.rows[0];
  const { hashToken, resetPasswordExpireTime, resetToken } =
    generateResetPasswordToken();
  await database.query(
    `UPDATE users SET reset_password_token=$1, reset_password_expire=to_timestamp($2) WHERE email=$3`,
    [hashToken, resetPasswordExpireTime / 1000, email],
  );
  // const resetPasswordUrl = `${frontendUrl}/password/reset/${resetToken}`;
  const resetPasswordUrl5173 = `http://localhost:5173/password/reset/${resetToken}`;
  const resetPasswordUrl5174 = `http://localhost:5174/password/reset/${resetToken}`;
  // const message = generateForgetPassTemp(resetPasswordUrl);
  const message5173 = generateForgetPassTemp(resetPasswordUrl5173);
  const message5174 = generateForgetPassTemp(resetPasswordUrl5174);

  try {
    await sendEmail({
      email: user.email,
      subject: "Ecommerce Password Recovery",
      message: message5173,
    });
    await sendEmail({
      email: user.email,
      subject: "Ecommerce Password Recovery",
      message: message5174,
    });
    console.log("User found:", user.email);
    console.log("Sending email to 5173...");
    // after first sendEmail
    console.log("5173 email sent!");
    console.log("Sending email to 5174...");
    // after second sendEmail
    console.log("5174 email sent!");
    return res.status(200).json({
      success: true,
      message: `If account exists, a reset ${user.email} has been sent.`,
    });
  } catch (error) {
    console.error("❌ Email sending error:", error);
    await database.query(
      `UPDATE users SET reset_password_token=NULL, reset_password_expire=NULL WHERE email=$1`,
      [email],
    );

    return next(new ErrorHandler("Email could not be sent", 500));
  }
});
const resetPasswsord = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  console.log(124);
  const user = await database.query(
    "SELECT * FROM users WHERE reset_password_token=$1 AND reset_password_expire>NOW()",
    [resetPasswordToken],
  );
  console.log(129);
  if (user.rows.length === 0) {
    console.log(user.rows);
    return next(new ErrorHandler("Invalid or Expired reset Token", 400));
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password do not Match", 400));
  }

  if (
    req.body.password?.length < 8 ||
    req.body.password?.length > 16 ||
    req.body.confirmPassword?.length < 8 ||
    req.body.confirmPassword?.length > 16
  ) {
    return next(
      new ErrorHandler("Password must be between 8 and 16 characters"),
    );
  }
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  await database.query(
    "UPDATE users SET password=$1, reset_password_token=NULL, reset_password_expire=NULL WHERE id=$2",
    [hashedPassword, user.rows[0].id],
  );

  res.status(200).json({
    success: true,
    user,
    message: "Password reset successful",
  });
});
//  Update passwi=ord
const updatePassword = catchAsyncError(async (req, res, next) => {
  const { cuurentPassword, newPassword, confirmNewPassword } = req.body;
  if (!cuurentPassword || !newPassword || !confirmNewPassword) {
    return next(new ErrorHandler("Please Provide all Filed", 400));
  }
  const isPasswordMatch = await bcrypt.compare(
    cuurentPassword,
    req.user.password,
  );
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Curent password is wrong", 400));
  }
  if (newPassword !== confirmNewPassword) {
    return next(new ErrorHandler("new password do not match", 400));
  }
  if (
    newPassword.length < 8 ||
    newPassword.length > 16 ||
    confirmNewPassword.length < 8 ||
    confirmNewPassword.length > 16
  ) {
    return next(
      new ErrorHandler("Password must be between 8 and 16 characters"),
    );
  }
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await database.query("UPDATE users SET password=$1 WHERE id=$2", [
    hashedNewPassword,
    req.user.id,
  ]);

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});
const updateProfile = catchAsyncError(async (req, res, next) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return next(new ErrorHandler("Please provide all fields", 400));
  }

  if (name.trim().length === 0 || email.trim().length === 0) {
    return next(new ErrorHandler("Name and Email cannot be empty", 400));
  }

  let avatarData = {};

  if (req.files && req.files.avatar) {
    const { avatar } = req.files;

    if (req.user?.avatar?.public_id) {
      await cloudinary.uploader.destroy(req.user.avatar.public_id);
    }
    console.log("data", 218);
    const newProfileImage = await cloudinary.uploader.upload(
      avatar.tempFilePath,
      {
        folder: "Ecommerce_Avatar",
        width: 150,
        crop: "scale",
      },
    );
    console.log("data", 227);
    avatarData = {
      public_id: newProfileImage.public_id,
      url: newProfileImage.secure_url,
    };
  }

  // If no new avatar, keep the current avatar
  const finalAvatar =
    Object.keys(avatarData).length === 0 ? req.user.avatar : avatarData;
  console.log("data", 236);
  const updateUser = await database.query(
    "UPDATE users SET name=$1, email=$2, avatar=$3 WHERE id=$4 RETURNING *",
    [name, email, finalAvatar, req.user.id],
  );

  res.status(200).json({
    success: true,
    user: updateUser.rows[0],
    message: "Profile updated successfully",
  });
});

module.exports = {
  register,
  Login,
  Logout,
  GetUsers,
  getAllUser,
  forgotPassword,
  resetPasswsord,
  updatePassword,
  updateProfile,
};
