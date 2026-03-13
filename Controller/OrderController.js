const database = require("../Database/db");
const catchAsyncError = require("../Middlewares/catchAsyncError");
const {
  ErrorHandler,
  errorMiddleware,
} = require("../Middlewares/errorMiddlewares");
const generatePaymentIntents = require("../Utils/generatePaymentIntent");
const placeNewOrder = catchAsyncError(async (req, res, next) => {
  const {
    full_name,
    state,
    city,
    country,
    address,
    pincode,
    phone,
    orderItem,
  } = req.body;
  if (
    !full_name ||
    !state ||
    !city ||
    !country ||
    !address ||
    !pincode ||
    !phone ||
    !orderItem
  ) {
    return next(new ErrorHandler("Please Providing All Shipng Detail", 400));
  }
  const items = Array.isArray(orderItem) ? orderItem : JSON.parse(orderItem);
  if (!items || items.length === 0) {
    return next(new ErrorHandler("No Item Found in cart", 400));
  }
  const productsId = items.map((item) => item.product.id);
  const { rows: products } = await database.query(
    `SELECT id,price,stock,name FROM products WHERE id =ANY($1::uuid[])`,
    [productsId],
  );
  let total_price = 0;
  const values = [];
  const placeholders = [];
  //   find product id
  items.forEach((item, index) => {
    const product = products.find((p) => p.id === item.product.id);
    if (!product) {
      return next(
        new ErrorHandler(`Not Found Product id ${item.product.id}`, 404),
      );
    }
    // Quantity check
    if (item.quantity > product.stock) {
      return next(
        new ErrorHandler(
          `Only ${product.stock} units available for ${product.name}`,
        ),
      );
    }
    // Total Price
    const itemTotal = product.price * item.quantity;
    total_price += itemTotal;
    values.push(
      null,
      product.id,
      item.quantity,
      product.price,
      item.product.images[0].url || "",
      product.name,
    );
    const offset = index * 6;
    placeholders.push(
      `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${
        offset + 5
      },$${offset + 6})`,
    );
  });
  const tax_price = 0.18;
  const shipping_price = total_price >= 50 ? 0 : 2;
  total_price = Math.round(
    total_price + total_price * tax_price + shipping_price,
  );
  const orderResult = await database.query(
    `INSERT INTO orders(buyer_id,total_price,tax_price,shipping_price) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.id, total_price, tax_price, shipping_price],
  );
  const orderId = orderResult.rows[0].id;
  for (let i = 0; i < values.length; i += 6) {
    values[i] = orderId;
  }
  //   insert data into order_item tables
  await database.query(
    `INSERT INTO order_items(order_id,product_id,quantity,price,image,title) VALUES ${placeholders.join(
      " , ",
    )} RETURNING *`,
    values,
  );
  //   Shipping data insert
  await database.query(
    `INSERT INTO shipping_info(order_id,full_name,state,city,country,address,pincode,phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [orderId, full_name, state, city, country, address, pincode, phone],
  );
  const paymentResponse = await generatePaymentIntents(orderId, total_price);
  if (!paymentResponse.success) {
    return next(new ErrorHandler("Payment Failed .Try Again ", 500));
  }
  res.status(200).json({
    success: true,
    message: "Order placed successfull please proceed to payemnts",
    paymentIntent: paymentResponse.clientSecret,
    total_price,
  });
});
// Fetch Single Order
// const SingleFetchProduct = catchAsyncError(async (req, res, next) => {
//   const { orderId } = req.params;
//   const orderResult = await database.query(
//     `SELECT
//     o.*,
//     COALESCE(
//         json_agg(
//             json_build_object(
//                 'order_item_id', oi.id,
//                 'order_id', oi.order_id,
//                 'product_id', oi.product_id,
//                 'quantity', oi.quantity,
//                 'price', oi.price
//             )
//         ) FILTER (WHERE oi.id IS NOT NULL), '[]'
//     ) AS order_items,
//     json_build_object(
//         'full_name', s.full_name,
//         'state', s.state,
//         'city', s.city,
//         'country', s.country,
//         'address', s.address,
//         'pincode', s.pincode,
//         'phone', s.phone
//     ) AS shipping_info
// FROM orders o
// LEFT JOIN order_items oi ON o.id = oi.order_id
// LEFT JOIN shipping_info s ON o.id = s.order_id
// WHERE o.id = $1
// GROUP BY o.id, s.id;
// `,
//     [orderId],
//   );
//   res.status(200).json({
//     success: true,
//     message: "Order Fetch Successfully",
//     orders: orderResult.rows[0],
//   });
// });
// Fetch Single Order
const SingleFetchProduct = catchAsyncError(async (req, res, next) => {
  const { orderId } = req.params;
  const orderResult = await database.query(
    `SELECT 
      o.*, 
      p.payment_status,
      p.payment_type,
      p.payment_intent_id,
      p.created_at as payment_created_at,
      COALESCE(
          json_agg(
              json_build_object(
                  'order_item_id', oi.id,
                  'order_id', oi.order_id,
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'image', oi.image,
                  'title', oi.title
              )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS order_items,
      json_build_object(
          'full_name', s.full_name,
          'state', s.state,
          'city', s.city,
          'country', s.country,
          'address', s.address,
          'pincode', s.pincode,
          'phone', s.phone
      ) AS shipping_info
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN shipping_info s ON o.id = s.order_id
    LEFT JOIN LATERAL (
        SELECT payment_status, payment_type, payment_intent_id, created_at
        FROM payments
        WHERE order_id = o.id
        ORDER BY created_at DESC
        LIMIT 1
    ) p ON true
    WHERE o.id = $1
    GROUP BY o.id, s.id, p.payment_status, p.payment_type, p.payment_intent_id, p.created_at
    `,
    [orderId],
  );

  res.status(200).json({
    success: true,
    message: "Order Fetch Successfully",
    orders: orderResult.rows[0] || null,
  });
});
// Fetch My Order
// const FetchMyProduct = catchAsyncError(async (req, res, next) => {
//   const resultFetchedProduct = await database.query(
//     `SELECT o.*, COALESCE(
//     json_agg(
//       json_build_object(
//           'order_item_id', oi.id,
//                 'order_id', oi.order_id,
//                 'product_id', oi.product_id,
//                 'quantity', oi.quantity,
//                 'price', oi.price,
//                 'image', oi.image,
//                 'title', oi.title
//       )
//     ) FILTER (WHERE oi.id IS NOT NULL), '[]'
//     ) AS order_items,
//        json_build_object(
//         'full_name', s.full_name,
//         'state', s.state,
//         'city', s.city,
//         'country', s.country,
//         'address', s.address,
//         'pincode', s.pincode,
//         'phone', s.phone
//     ) AS shipping_info
//       FROM orders o
//       LEFT JOIN order_items oi ON o.id = oi.order_id
//       LEFT JOIN shipping_info s ON o.id = s.order_id
// WHERE o.buyer_id = $1
// GROUP BY o.id, s.id
// `,
//     [req.user.id],
//   );
//   res.status(200).json({
//     message: "All Your Order Fteched Successfully",
//     orderResult: resultFetchedProduct.rows,
//     success: true,
//   });
// });
// Fetch My Order - Using LATERAL join correctly
const FetchMyProduct = catchAsyncError(async (req, res, next) => {
  const resultFetchedProduct = await database.query(
    `SELECT 
      o.*,
      p.payment_status,
      p.payment_type,
      p.payment_intent_id,
      p.created_at as payment_created_at,
      COALESCE(
          json_agg(
              json_build_object(
                  'order_item_id', oi.id,
                  'order_id', oi.order_id,
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'image', oi.image,
                  'title', oi.title
              )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS order_items,
      json_build_object(
          'full_name', s.full_name,
          'state', s.state,
          'city', s.city,
          'country', s.country,
          'address', s.address,
          'pincode', s.pincode,
          'phone', s.phone
      ) AS shipping_info
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN shipping_info s ON o.id = s.order_id
    LEFT JOIN LATERAL (
        SELECT payment_status, payment_type, payment_intent_id, created_at
        FROM payments
        WHERE order_id = o.id 
        ORDER BY created_at DESC
        LIMIT 1
    ) p ON true
    WHERE o.buyer_id = $1 AND o.paid_at IS NOT NULL
    GROUP BY o.id, s.id, p.payment_status, p.payment_type, p.payment_intent_id, p.created_at
    ORDER BY o.created_at DESC
    `,
    [req.user.id],
  );

  res.status(200).json({
    message: "All Your Order Fetched Successfully",
    orderResult: resultFetchedProduct.rows,
    success: true,
  });
});
// const FetchAllProduct = catchAsyncError(async (req, res, next) => {
//   const fetchAllorder = await database.query(`SELECT o.*,
//     COALESCE(json_agg(
//       json_build_object(
//         'order_item_id', oi.id,
//                 'order_id', oi.order_id,
//                 'product_id', oi.product_id,
//                 'quantity', oi.quantity,
//                 'price', oi.price,
//                 'image', oi.image,
//                 'title', oi.title
//       )
//     ) FILTER (WHERE oi.id IS NOT NULL), '[]' ) AS order_items, json_build_object(
//     'full_name', s.full_name,
//         'state', s.state,
//         'city', s.city,
//         'country', s.country,
//         'address', s.address,
//         'pincode', s.pincode,
//         'phone', s.phone
//     ) AS shipping_info
//      FROM orders o
//      LEFT JOIN order_items oi ON o.id = oi.order_id
//      LEFT JOIN shipping_info s ON o.id = s.order_id
//      GROUP BY o.id, s.id
// `);
//   res.status(200).json({
//     success: true,
//     message: "All Ordered Fetched Successfully",
//     orderStatus: fetchAllorder.rows,
//   });
// });
const FetchAllProduct = catchAsyncError(async (req, res, next) => {
  const fetchAllorder = await database.query(
    `SELECT 
      o.*,
      p.payment_status,
      p.payment_type,
      p.payment_intent_id,
      p.created_at as payment_created_at,
      COALESCE(
          json_agg(
              json_build_object(
                  'order_item_id', oi.id,
                  'order_id', oi.order_id,
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'image', oi.image,
                  'title', oi.title
              )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS order_items,
      json_build_object(
          'full_name', s.full_name,
          'state', s.state,
          'city', s.city,
          'country', s.country,
          'address', s.address,
          'pincode', s.pincode,
          'phone', s.phone
      ) AS shipping_info
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN shipping_info s ON o.id = s.order_id
    LEFT JOIN LATERAL (
        SELECT payment_status, payment_type, payment_intent_id, created_at
        FROM payments
        WHERE order_id = o.id
        ORDER BY created_at DESC
        LIMIT 1
    ) p ON true
    GROUP BY o.id, s.id, p.payment_status, p.payment_type, p.payment_intent_id, p.created_at
    ORDER BY o.created_at DESC
    `,
  );

  res.status(200).json({
    success: true,
    message: "All Ordered Fetched Successfully",
    orderStatus: fetchAllorder.rows,
  });
});
//   Update Ordered
const updateOrdered = catchAsyncError(async (req, res, next) => {
  const { status } = req.body;
  if (!status) {
    return next(new ErrorHandler("Please Provide Valid Status", 400));
  }
  const { orderId } = req.params;
  const getResult = await database.query(`SELECT * FROM  orders WHERE id=$1`, [
    orderId,
  ]);
  if (getResult.rows.length === 0) {
    return next(new ErrorHandler("Invalid Id", 404));
  }
  const orderUpdateStatus = await database.query(
    `UPDATE orders SET order_status=$1 WHERE id=$2 RETURNING *`,
    [status, orderId],
  );
  res.status(200).json({
    message: "Order Updated Successfully",
    success: true,
    orderUpdateStatus: orderUpdateStatus.rows[0],
  });
});
//Delete Order
const DeleteOrder = catchAsyncError(async (req, res, next) => {
  const { orderId } = req.params;
  const DeleteResult = await database.query(
    `DELETE FROM orders WHERE id =$1 RETURNING *`,
    [orderId],
  );
  if (DeleteResult.rows.length === 0) {
    return next(new ErrorHandler("Invalid Id", 404));
  }
  res.status(200).json({
    message: "Order Deleted Successfully",
    success: true,
    DeleteResult: DeleteResult.rows[0],
  });
});
module.exports = {
  placeNewOrder,
  SingleFetchProduct,
  FetchMyProduct,
  FetchAllProduct,
  updateOrdered,
  DeleteOrder,
};
