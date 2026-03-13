require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const CreatTables = require("./Utils/CreateTables");
const { errorMiddleware } = require("./Middlewares/errorMiddlewares");
const Authroutes = require("./Routes/AuthRoutes");
const ProdcutRoutes = require("./Routes/ProductRoutes");
const AdminRoutes = require("./Routes/AdminRoutes");
const OrderRoutes = require("./Routes/OrderRoutes");
const wishlistRoutes = require("./Routes/wishlistRoutes");
const SubscribeEmail = require("./Routes/subscribeRoutes");
const ContactRoutes = require("./Routes/contactRoutes");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const database = require("./Database/db");
const app = express();

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.DASHBOARD_URL,
      "http://localhost:3000",
      "http://localhost:4200",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
// Stripe Method
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    let events;

    try {
      // Use the stripe instance, not Stripe class
      events = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      console.log("Webhook signature verification failed:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    // Handle The Events
    if (events.type === "payment_intent.succeeded") {
      const paymentIntentId = events.data.object.id;
      console.log("Payment succeeded for:", paymentIntentId);

      try {
        const updatedPaymentStatus = "Paid";
        const paymentTableUpdateStatus = await database.query(
          `UPDATE payments SET payment_status=$1 WHERE payment_intent_id=$2 RETURNING *`,
          [updatedPaymentStatus, paymentIntentId],
        );

        if (paymentTableUpdateStatus.rows.length === 0) {
          console.log("Payment not found in DB for intent:", paymentIntentId);
          return res.status(404).send("Payment not found in DB");
        }

        await database.query(
          `UPDATE orders SET Paid_at=NOW() WHERE id=$1 RETURNING *`,
          [paymentTableUpdateStatus.rows[0].order_id],
        );

        // Reduce Stock for Each Product
        const orderId = paymentTableUpdateStatus.rows[0].order_id;
        const { rows: orderedItem } = await database.query(
          `SELECT product_id, quantity FROM order_items WHERE order_id=$1`,
          [orderId],
        );

        for (const item of orderedItem) {
          await database.query(
            `UPDATE products SET stock=stock - $1 WHERE id=$2`,
            [item.quantity, item.product_id],
          );
        }

        console.log("Payment and order updated successfully");
      } catch (error) {
        console.error("Database error:", error);
        return res.status(500).send(`Error updating payment: ${error.message}`);
      }
    }

    res.status(200).json({ received: true });
  },
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./uploads",
  }),
);
app.use((req, res, next) => {
  console.log("\n========== REQUEST ==========");
  console.log(`${req.method} ${req.url}`);
  console.log("Cookies:", req.cookies); // ✅ ab defined hoga
  console.log("Body:", req.body);
  console.log("Origin:", req.headers.origin);
  next(); // ✅ yeh zaroori hai - warna request stuck ho jati hai
});
app.use("/api/v1/auth", Authroutes);
app.use("/api/v1/product", ProdcutRoutes);
app.use("/api/v1/admin", AdminRoutes);
app.use("/api/v1/order", OrderRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/email", SubscribeEmail);
app.use("/api/v1/contact", ContactRoutes);

CreatTables();
app.use(errorMiddleware);
app.get("/", (req, res) => {
  res.send("API is alive & working");
});

module.exports = app;
