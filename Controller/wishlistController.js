const database = require("../Database/db");

// Add to Wishlist
const AddToWishList = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  try {
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Check if product exists
    const productCheck = await database.query(
      `SELECT id FROM products WHERE id = $1`,
      [productId],
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Add to wishlist
    await database.query(
      `INSERT INTO wishlist(user_id, product_id) 
       VALUES($1, $2) 
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [userId, productId],
    );
    const wishlist = await database.query(
      `SELECT 
        w.id,
        w.product_id,
        w.created_at,
        p.name,
        p.description,
        p.price,
        p.images,
        p.stock,
        p.category,
        p.ratings
      FROM wishlist w
      JOIN products p ON p.id = w.product_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC`,
      [userId],
    );

    res.status(200).json({
      success: true,
      message: "Added to WishList",
      wishlist: wishlist.rows,
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Remove from Wishlist
const RemoveFromWishlIst = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  try {
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Check if item exists in wishlist
    const existingItem = await database.query(
      `SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2`,
      [userId, productId],
    );

    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      });
    }

    // Remove from wishlist
    await database.query(
      `DELETE FROM wishlist WHERE user_id=$1 AND product_id=$2`,
      [userId, productId],
    );

    // Get updated wishlist with product details
    const wishlist = await database.query(
      `SELECT 
        w.id,
        w.product_id,
        w.created_at,
        p.name,
        p.description,
        p.price,
        p.images,
        p.stock,
        p.category,
        p.ratings
      FROM wishlist w
      JOIN products p ON p.id = w.product_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC`,
      [userId],
    );

    res.status(200).json({
      success: true,
      message: "Removed from wishlist",
      wishlist: wishlist.rows,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get User Wishlist
const GetUserWishList = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await database.query(
      `SELECT 
        w.id,
        w.product_id,
        w.created_at,
        p.name,
        p.description,
        p.price,
        p.images,
        p.stock,
        p.category,
        p.ratings
      FROM wishlist w 
      JOIN products p ON p.id = w.product_id 
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC`,
      [userId],
    );

    res.status(200).json({
      success: true,
      wishlist: result.rows,
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { AddToWishList, RemoveFromWishlIst, GetUserWishList };
