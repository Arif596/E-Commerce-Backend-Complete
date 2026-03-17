const express = require("express");
const router = express.Router();
const {
  createProduct,
  FetchAllProduct,
  updatedProduct,
  DeleteProduct,
  SingleProduct,
  DeleteReview,
  postReview,
  fetchAIFilteredProducts,
} = require("../Controller/productController");
const {
  isAuthenticated,
  authorizedRoles,
} = require("../Middlewares/AuthMiddleware");
// Create   product
router.post(
  "/admin/create",
  isAuthenticated,
  authorizedRoles("Admin"),
  createProduct,
);
// Get all   product
router.get("/all-product", FetchAllProduct);
// Update  product
router.put(
  "/admin/update-product/:productId",
  isAuthenticated,
  authorizedRoles("Admin"),
  updatedProduct,
);
// Delete product
router.delete(
  "/admin/delete-product/:productId",
  isAuthenticated,
  authorizedRoles("Admin"),
  DeleteProduct,
);
// Post review or Update review
router.put("/post-new/review/:productId", isAuthenticated, postReview);
// delete review
router.delete("/delete/review/:productId", isAuthenticated, DeleteReview);
// find single product by id
router.get("/single-product/:productId", SingleProduct);
// Ai Filter searching
router.post("/ai-search-product", isAuthenticated, fetchAIFilteredProducts);
module.exports = router;
