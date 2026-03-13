const catchAsyncError = require("../Middlewares/catchAsyncError");
const { ErrorHandler } = require("../Middlewares/errorMiddlewares");
const database = require("../Database/db");
const cloudinary = require("cloudinary").v2;
const StopKey = require("../Utils/stopwords");
const getAIRecommendation = require("../Utils/getAIRecommendation");
const createProduct = catchAsyncError(async (req, res, next) => {
  const { name, description, category, price, stock } = req.body;
  const created_by = req.user.id;
  if (!name || !description || !category || !price || !stock) {
    return next(new ErrorHandler("Please Provide product List", 400));
  }
  let uploadImages = [];
  if (req.files && req.files.image) {
    const images = Array.isArray(req.files.image)
      ? req.files.image
      : [req.files.image];
    for (const image of images) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Product_Images",
        width: 1000,
        crop: "scale",
      });
      uploadImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }
  }
  const product = await database.query(
    `INSERT INTO products (name, description, category, price, stock,images,created_by)VALUES($1,$2,$3,$4,$5,$6,$7)RETURNING *`,
    [
      name,
      description,
      category,
      price,
      stock,
      JSON.stringify(uploadImages),
      created_by,
    ],
  );
  res.status(201).json({
    success: true,
    message: "Product created Successfully",
    product: product.rows[0],
  });
});

// FetchAllProduct
const FetchAllProduct = catchAsyncError(async (req, res, next) => {
  const { availability, category, price, search, ratings } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit; // offset in postgres is used to skip item which you want
  const newCondition = [];
  let value = [];
  let index = 1;
  let paginationPlaceholder = {};
  // Product filter by Availability
  if (availability === "in-stock") {
    newCondition.push(`stock >5`);
  } else if (availability === "limited") {
    newCondition.push(`stock>0 AND stock<=5`);
  } else if (availability === "out-of-stock") {
    newCondition.push(`stock=0`);
  }
  // Product filter by Price
  if (price) {
    const [minPrice, maxPrice] = price.split("-");
    if (minPrice && maxPrice) {
      newCondition.push(`price BETWEEN $${index} AND $${index + 1}`);
      value.push(minPrice, maxPrice);
      index += 2;
    }
  }
  // Product filter by Category
  if (category) {
    newCondition.push(`category ILIKE $${index}`);
    value.push(`%${category}%`);
    index++;
  }
  // Product filter by rating
  if (ratings) {
    newCondition.push(`ratings>= $${index}`);
    value.push(ratings);
    index++;
  }
  // Product filter by Search
  if (search) {
    newCondition.push(
      `(p.name ILIKE $${index} OR p.description ILIKE $${index})`,
    );
    value.push(`%${search}%`);
    index++;
  }
  const WHERECLAUSE = newCondition.length
    ? `WHERE ${newCondition.join(" AND ")}`
    : "";
  // Get Count of Filtered Product
  const totalProductsResult = await database.query(
    `SELECT COUNT(*) FROM products p ${WHERECLAUSE}`,
    value,
  );
  const TotalProduct = parseInt(totalProductsResult.rows[0].count);
  paginationPlaceholder.limit = `$${index}`;
  value.push(limit);
  index++;
  paginationPlaceholder.offset = `$${index}`;
  value.push(offset);
  index++;

  // Fetch with Review
  const query = `SELECT p.*,COUNT(r.id)
  AS review_count FROM products p LEFT JOIN
   reviews r ON p.id=r.product_id ${WHERECLAUSE}
   GROUP BY p.id
   ORDER BY p.created_at DESC
   LIMIT ${paginationPlaceholder.limit}
   OFFSET ${paginationPlaceholder.offset}`;
  const result = await database.query(query, value);
  // //Query for  Fetching new Product
  const newProductsQuery = `SELECT p.*, COUNT(r.id) AS review_count
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id
WHERE p.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 9
`;
  const newProductResult = await database.query(newProductsQuery);
  // //Query for  Fetching Top Rated Product
  const TopRatedProduct = `SELECT p.*, COUNT(r.id) AS review_count
  FROM products p
  LEFT JOIN reviews r ON p.id = r.product_id
  WHERE p.ratings >= 4.5
  GROUP BY p.id
  ORDER BY p.ratings DESC,p.created_at DESC
  LIMIT 8`;
  const TopratedProductResult = await database.query(TopRatedProduct);
  res.status(200).json({
    success: true,
    message: "All Product Fetched Successfully",
    product: result.rows,
    newProductResult: newProductResult.rows,
    totalProductsResult: totalProductsResult.rows,
    TopratedProductResult: TopratedProductResult.rows,
    totalProduct: TotalProduct,
  });
});
// Update Product
const updatedProduct = catchAsyncError(async (req, res, next) => {
  const { productId } = req.params;
  const { name, description, category, price, stock } = req.body;
  if (!name || !description || !category || !price || !stock) {
    return next(new ErrorHandler("Please Provide product List", 400));
  }
  const product = await database.query(`SELECT* FROM products WHERE id=$1`, [
    productId,
  ]);
  console.log("All Product", product);
  if (product.rows.length === 0) {
    return next(new ErrorHandler("Product not found", 404));
  }
  let uploadImages = product.rows[0].images || [];
  if (req.files && req.files.image) {
    for (const img of uploadImages) {
      await cloudinary.uploader.destroy(img.public_id);
    }
    uploadImages = [];
    const images = Array.isArray(req.files.image)
      ? req.files.image
      : [req.files.image];
    for (const image of images) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Product_Images",
        width: 1000,
        crop: "scale",
      });
      uploadImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }
  }
  const result = await database.query(
    `UPDATE products SET name=$1, description=$2,category=$3,price=$4,stock=$5, images=$6 WHERE id=$7 RETURNING*`,
    [
      name,
      description,
      category,
      price,
      stock,
      JSON.stringify(uploadImages),
      productId,
    ],
  );
  res.status(200).json({
    success: true,
    message: "Product Update Successfully",
    product: result.rows[0],
  });
});
// Delete Product
const DeleteProduct = catchAsyncError(async (req, res, next) => {
  const { productId } = req.params;
  const product = await database.query(`SELECT* FROM products WHERE id=$1`, [
    productId,
  ]);
  if (product.rows.length === 0) {
    return next(new ErrorHandler("Product Not Found", 404));
  }
  const images = product.rows[0].images;
  const deleleteProductresult = await database.query(
    `DELETE FROM products WHERE id=$1 RETURNING*`,
    [productId],
  );
  if (deleleteProductresult.rows.length === 0) {
    return next(new ErrorHandler("Failed Delete Product", 500));
  }
  if (images && images.length > 0) {
    for (const image of images) {
      await cloudinary.uploader.destroy(image.public_id);
    }
  }
  res.status(200).json({
    success: true,
    message: "Product Deleted Successfully",
    deleleteProductresult: deleleteProductresult.rows[0],
  });
});
// Fetch Single Product
const SingleProduct = catchAsyncError(async (req, res, next) => {
  const { productId } = req.params;
  console.log("Fetching product ID:", productId);
  const result = await database.query(
    //  COALESCE ensures that even if no reviews exist Merge All Talble, we return an empty JSON array [] instead of NULL ,
    `SELECT p.*, COALESCE(json_agg(       
    json_build_object(
    'review_id',r.id,
    'rating',r.ratings,
    'comment',r.comment,
    'reviewer',json_build_object(
    'id',u.id,
    'name',u.name,
    'avatar',u.avatar
    )
    ))
    FILTER (WHERE r.id IS NOT NULL),'[]'
    ) AS reviews FROM products p LEFT JOIN  reviews r ON p.id=r.product_id
     LEFT JOIN users u ON r.user_id=u.id
     WHERE p.id=$1
     GROUP BY p.id `,
    [productId],
  );
  console.log("Query result rows:", result.rows.length);
  console.log("Product data:", JSON.stringify(result.rows[0], null, 2));
  res.status(200).json({
    success: true,
    message: "Product Fetched Successfully",
    product: result.rows[0],
  });
});

// In productController.js - FIXED postReview function
const postReview = catchAsyncError(async (req, res, next) => {
  const { productId } = req.params;
  const { ratings, comments } = req.body;
  console.log("Posting review for product:", productId, "User:", req.user.id);
  console.log("Review data:", { ratings, comments });

  if (!ratings || !comments) {
    return next(
      new ErrorHandler("Please Provide First Review and Comments", 400),
    );
  }

  // Purchase check - using order_items (plural)
  try {
    const purchaseCheckQuery = `
      SELECT oi.product_id
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN payments p ON p.order_id = o.id
      WHERE o.buyer_id = $1
      AND oi.product_id = $2
      AND p.payment_status = 'Paid'
      LIMIT 1
    `;

    const { rows } = await database.query(purchaseCheckQuery, [
      req.user.id,
      productId,
    ]);

    console.log("Purchase check result:", rows);

    if (rows.length === 0) {
      // For testing, you might want to comment this out temporarily
      return res.status(403).json({
        success: false,
        message: "You can only review a product you have purchased",
      });
    }
  } catch (error) {
    console.error("Purchase check error:", error.message);
    // For development, you might skip this check
    // return next(new ErrorHandler("Error checking purchase: " + error.message, 500));
    console.log("Skipping purchase check for development");
  }

  const productSearch = await database.query(
    `SELECT * FROM products WHERE id = $1`,
    [productId],
  );

  if (productSearch.rows.length === 0) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const isAlreadyReviewed = await database.query(
    `SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2`,
    [productId, req.user.id],
  );

  let review;
  if (isAlreadyReviewed.rows.length > 0) {
    // Update existing review
    review = await database.query(
      `UPDATE reviews SET ratings = $1, comment = $2 
       WHERE product_id = $3 AND user_id = $4 RETURNING *`,
      [ratings, comments, productId, req.user.id],
    );
  } else {
    // Insert new review - make sure column names match your table
    review = await database.query(
      `INSERT INTO reviews (product_id, user_id, comment, ratings) 
       VALUES($1, $2, $3, $4) RETURNING *`,
      [productId, req.user.id, comments, ratings],
    );
  }

  // Update product average rating - FIXED: use 'ratings' column
  const allReview = await database.query(
    `SELECT AVG(ratings) AS avg_rating FROM reviews WHERE product_id = $1`,
    [productId],
  );

  const newAvgRating = allReview.rows[0].avg_rating || 0;
  console.log("New average rating:", newAvgRating);

  const updatedProduct = await database.query(
    `UPDATE products SET ratings = $1 WHERE id = $2 RETURNING *`,
    [newAvgRating, productId],
  );

  res.status(200).json({
    success: true,
    message: "Review Posted Successfully",
    review: review.rows[0],
    product: updatedProduct.rows[0],
  });
});
// Delete Review

// In productController.js - FIXED DeleteReview function
const DeleteReview = catchAsyncError(async (req, res, next) => {
  const { productId } = req.params;
  console.log("Deleting review for product:", productId, "User:", req.user.id);
  // First check if review exists
  const checkReview = await database.query(
    `SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2`,
    [productId, req.user.id],
  );
  if (checkReview.rows.length === 0) {
    return next(new ErrorHandler("Review not found!", 404));
  }
  const result = await database.query(
    `DELETE FROM reviews WHERE product_id = $1 AND user_id = $2 RETURNING *`,
    [productId, req.user.id],
  );
  console.log("Deleted review:", result.rows[0]);
  // Update product average rating - FIXED: use 'ratings' column
  const allReview = await database.query(
    `SELECT AVG(ratings) AS avg_rating FROM reviews WHERE product_id = $1`,
    [productId],
  );
  const newAvgRating = allReview.rows[0].avg_rating || 0;
  console.log("Updated average rating after deletion:", newAvgRating);
  const updatedProduct = await database.query(
    `UPDATE products SET ratings = $1 WHERE id = $2 RETURNING *`,
    [newAvgRating, productId],
  );

  res.status(200).json({
    success: true,
    message: "Your Review has been Deleted successfully",
    review: result.rows[0],
    product: updatedProduct.rows[0],
  });
});

// productController.js - Update this function
const fetchAIFilteredProducts = catchAsyncError(async (req, res, next) => {
  const { UserPrompt } = req.body;
  console.log(UserPrompt);

  if (!UserPrompt) {
    return next(new ErrorHandler("Please Provide Valid Prompt", 400));
  }

  const FilterKeyword = (query) => {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => !StopKey.has(word))
      .map((word) => `%${word}%`);
  };

  const keywords = FilterKeyword(UserPrompt);
  console.log("All Keywords", keywords);
  console.log("UserPrompt", UserPrompt);

  // Step 1: Basic SQL Filtering
  const result = await database.query(
    `SELECT * FROM products WHERE name ILIKE ANY($1)
    OR description ILIKE ANY($1)
    OR category ILIKE ANY($1)
    LIMIT 200 `,
    [keywords],
  );

  const filteredResult = result.rows;

  if (filteredResult.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No Product Found matching Your Prompt",
      products: [],
      keywords: keywords,
    });
  }

  // Step 2: AI Filtering - Remove req, res parameters
  try {
    const aiResult = await getAIRecommendation(UserPrompt, filteredResult);

    return res.status(200).json({
      success: aiResult.success,
      message: "AI Filtered Product",
      products: aiResult.products,
      keywords: keywords,
      count: aiResult.products.length,
    });
  } catch (error) {
    console.error("AI Processing Error:", error);

    // Fallback: return SQL filtered results
    return res.status(200).json({
      success: true,
      message: "Products found (AI filtering skipped)",
      products: filteredResult,
      keywords: keywords,
      count: filteredResult.length,
    });
  }
});
module.exports = {
  createProduct,
  FetchAllProduct,
  updatedProduct,
  DeleteProduct,
  SingleProduct,
  postReview,
  fetchAIFilteredProducts,
  DeleteReview,
};
