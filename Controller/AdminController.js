const database = require("../Database/db");
const catchAsyncError = require("../Middlewares/catchAsyncError");
const { ErrorHandler } = require("../Middlewares/errorMiddlewares");
const cloudinary = require("cloudinary").v2;

const getAllUser = catchAsyncError(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const totalUsersResult = await database.query(
    "SELECT COUNT(*) FROM users WHERE role=$1",
    ["User"],
  );
  const totalUsers = parseInt(totalUsersResult.rows[0].count);
  const offset = (page - 1) * 10;
  const users = await database.query(
    "SELECT * FROM users WHERE role=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    ["User", 10, offset],
  );
  res
    .status(200)
    .json({ success: true, totalUsers, currentPage: page, users: users.rows });
});
// Delete User
const DeleteUsers = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  console.log(id);
  const deletedUser = await database.query(
    `DELETE FROM users WHERE id=$1 RETURNING *`,
    [id],
  );

  if (!deletedUser.rows || deletedUser.rows.length === 0) {
    return next(new ErrorHandler("User Not Found", 404));
  }
  const avatar = deletedUser.rows[0].avatar;

  if (avatar?.public_id) {
    await cloudinary.uploader.destroy(avatar.public_id);
  }
  console.log("Avatar", avatar);
  res.status(200).json({
    message: "User Deleted Successfully",
    success: true,
  });
});
const DashbaordStats = catchAsyncError(async (req, res, next) => {
  const today = new Date();
  const todayDate =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayDates =
    yesterday.getFullYear() +
    "-" +
    String(yesterday.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(yesterday.getDate()).padStart(2, "0");
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  );
  const PreveiousMonthStart = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1,
  );
  const PreveiousMonthend = new Date(today.getFullYear(), today.getMonth(), 0);
  //   All Revinue Result
  const totalRevinueAllTimeResult = await database.query(
    `SELECT SUM(total_price) FROM orders`,
  );
  const totalRevinueAllTime =
    parseFloat(totalRevinueAllTimeResult.rows[0].sum) || 0;
  //   All User Result
  const totalUserCountQuery = await database.query(
    `SELECT COUNT(*) FROM users WHERE role='User'`,
  );

  const totaluserCount = parseInt(totalUserCountQuery.rows[0].count) || 0;
  //   All Order Result
  const orderStatusQuery = await database.query(
    `SELECT order_status, COUNT(*) FROM orders GROUP BY order_status`,
  );
  const orderStatusCounts = {
    Processing: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
  };
  orderStatusQuery.rows.forEach((row) => {
    orderStatusCounts[row.order_status] = parseInt(row.count);
  });
  //   Today Revinew
  const todayRevinue = await database.query(
    `SELECT SUM(total_price) FROM orders WHERE DATE (created_at)=$1 `,
    [todayDate],
  );
  const todayRevinueResult = parseFloat(todayRevinue.rows[0].sum) || 0;
  //   Yesterday Revinew
  const yesterDayRevinue = await database.query(
    `SELECT SUM(total_price) FROM orders WHERE DATE (created_at)=$1 `,
    [yesterdayDates],
  );
  const yesterdayRevinueResult = parseFloat(yesterDayRevinue.rows[0].sum) || 0;
  const monthlySaleQuery = await database.query(`
  SELECT
  TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month_label,
  DATE_TRUNC('month', created_at) AS month_date,
  COALESCE(SUM(total_price), 0)::numeric AS totalSales
FROM orders
GROUP BY month_label, month_date
ORDER BY month_date ASC;
`);
  const MonthlySale = monthlySaleQuery.rows.map((row) => ({
    month: row.month_label,
    totalSales: parseFloat(row.totalsales) || 0,
  }));
  console.log(monthlySaleQuery.rows);
  //   Top Five Most sold product
  const topproductQuery = await database.query(`
    SELECT p.name,p.images->0->>'url'AS image,
    p.category,
    p.ratings,SUM(oi.quantity) AS total_sold
    FROM order_items oi
    JOIN products p ON p.id=oi.product_id
    GROUP BY p.name,p.images,p.category,p.ratings
    ORDER BY total_sold DESC
    LIMIT 5
    `);
  const topProducts = topproductQuery.rows;
  //   Current Month Sale
  const currentMonthSaleQuery = await database.query(
    `SELECT SUM(total_price) AS total
   FROM orders
   WHERE created_at BETWEEN $1 AND $2
    `,
    [currentMonthStart, currentMonthEnd],
  );
  const currentMonthSale = parseFloat(currentMonthSaleQuery.rows[0].total) || 0;
  //   Product with stock less than or equal to 5
  const LowStockProductQuery = await database.query(
    `SELECT name,stock FROM products WHERE stock <=5`,
  );
  const lowStockProducts = LowStockProductQuery.rows;
  //   Revenue Growth Rate %
  const lastMonthRevnueGrowthQuery = await database.query(
    `SELECT SUM(total_price) AS total FROM orders WHERE created_at BETWEEN $1 AND $2`,
    [PreveiousMonthStart, PreveiousMonthend],
  );
  const lastMonthRevenue =
    parseFloat(lastMonthRevnueGrowthQuery.rows[0].total) || 0;
  let revenueGrowth = "0%";
  if (lastMonthRevenue > 0) {
    const growthRate =
      ((currentMonthSale - lastMonthRevenue) / lastMonthRevenue) * 100;
    revenueGrowth = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(2)}%`;
  }
  //   new User this month register
  const newUserThisMonthQuery = await database.query(
    `SELECT COUNT(*) FROM users WHERE created_at >=$1 AND role='User'`,
    [currentMonthStart],
  );
  const newUserThisMonth = parseInt(newUserThisMonthQuery.rows[0].count) || 0;
  //   final Response
  res.status(200).json({
    message: "DashBoard Stats Fteched Successfully",
    success: true,
    totalRevinueAllTime,
    todayRevinueResult,
    yesterdayRevinueResult,
    totaluserCount,
    orderStatusCounts,
    MonthlySale,
    currentMonthSale,
    lowStockProducts,
    revenueGrowth,
    newUserThisMonth,
    topProducts,
  });
});
module.exports = { getAllUser, DeleteUsers, DashbaordStats };
