const express = require("express");
const {
  isAuthenticated,
  authorizedRoles,
} = require("../Middlewares/AuthMiddleware");
const {
  getAllUser,
  DeleteUsers,
  DashbaordStats,
} = require("../Controller/AdminController");
const router = express.Router();

router.get(
  "/get-all-users",
  isAuthenticated,
  authorizedRoles("Admin"),
  getAllUser
); // Get all Users
router.delete(
  "/delete-users/:id",
  isAuthenticated,
  authorizedRoles("Admin"),
  DeleteUsers
); // Delete User
router.get(
  "/get/dashboard-stats",
  isAuthenticated,
  authorizedRoles("Admin"),
  DashbaordStats
); // Delete User
module.exports = router;
