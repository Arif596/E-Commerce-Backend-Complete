const express = require("express");
const {
  isAuthenticated,
  authorizedRoles,
} = require("../Middlewares/AuthMiddleware");
const {
  placeNewOrder,
  SingleFetchProduct,
  FetchMyProduct,
  FetchAllProduct,
  updateOrdered,
  DeleteOrder,
} = require("../Controller/OrderController");
const router = express.Router();

router.post("/new/order", isAuthenticated, placeNewOrder);
router.get("/get-SingleOrder/:orderId", isAuthenticated, SingleFetchProduct);
router.get("/get-MyOrder/me", isAuthenticated, FetchMyProduct);
router.get("/get-AllOrder", isAuthenticated, FetchAllProduct);
router.put(
  "/admin/update-order/:orderId",
  isAuthenticated,
  authorizedRoles("Admin"),
  updateOrdered
);
router.delete(
  "/admin/delete-order/:orderId",
  isAuthenticated,
  authorizedRoles("Admin"),
  DeleteOrder
);
module.exports = router;
