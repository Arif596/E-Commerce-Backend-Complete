const database = require("../Database/db");
const sendEmail = require("../Utils/sendEmail");
const SubcriberEmialUser = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      sucess: false,
      message: "Email is required",
    });
  }
  try {
    const existing = await database.query(
      `SELECT * FROM subscribed_emails WHERE email=$1
       `,
      [email],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email Already Subcribed",
      });
    }
    await database.query(`INSERT INTO subscribed_emails(email) VALUES ($1)`, [
      email,
    ]);
    await sendEmail({
      email,
      subject: "Welcome To ShopMate  🎉",
      message: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thanks For Subscribing!! 🎉</h2>
          <p>You will now receive exclusive offers and updates from <strong>ShopMate</strong>.</p>
          <br/>
          <strong>Team ShopMate 🛍️</strong>
        </div>
      `,
    });
    res.status(200).json({
      sucess: true,
      message: "Subscribed Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Subscription failed",
    });
  }
};
module.exports = SubcriberEmialUser;
