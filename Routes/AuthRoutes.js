const express = require("express");
const {
  register,
  Login,
  GetUsers,
  Logout,
  getAllUser,
  forgotPassword,
  resetPasswsord,
  updatePassword,
  updateProfile,
} = require("../Controller/AuthController");
const { isAuthenticated } = require("../Middlewares/AuthMiddleware");
const router = express.Router();
router.post("/register", register);
router.post("/login", Login);
router.get("/logout", isAuthenticated, Logout);
router.get("/get-user", isAuthenticated, GetUsers);
router.get("/get-all-user", isAuthenticated, getAllUser);
router.post("/password/reset", forgotPassword);
router.put("/password/reset/:token", resetPasswsord);
router.put("/password/update", isAuthenticated, updatePassword);
router.put("/profile/update", isAuthenticated, updateProfile);
module.exports = router;
