const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../Middlewares/AuthMiddleware");
const {
  AddToWishList,
  RemoveFromWishlIst,
  GetUserWishList,
} = require("../Controller/wishlistController");

router.post("/addwishlist", isAuthenticated, AddToWishList);
router.delete("/:productId", isAuthenticated, RemoveFromWishlIst);
router.get("/getwishlist", isAuthenticated, GetUserWishList);
module.exports = router;
