const database = require("../Database/db");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const generatePaymentIntents = async (orderId, totalPrice) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalPrice * 100, // convert into cent
      currency: "usd",
    });
    await database.query(
      "INSERT INTO payments (order_id,payment_type,payment_status,payment_intent_id) VALUES ($1,$2,$3,$4)",
      [orderId, "Online", "Pending", paymentIntent.id],
    );
    return { success: true, clientSecret: paymentIntent.client_secret };
  } catch (error) {
    console.log("Payment Error", error.message || error);
    return { success: false, message: "Payment Failed" };
  }
};
module.exports = generatePaymentIntents;
