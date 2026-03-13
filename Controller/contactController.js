const sendEmail = require("../Utils/sendEmail");
const database = require("../Database/db");

const sendContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;
  console.log("Step 1 - Data Received:", { name, email, subject, message });
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }
  try {
    await database.query(
      `INSERT INTO contact_message(name,email,subject,message) VALUES($1,$2,$3,$4)`,
      [name, email, subject, message],
    );
    console.log("DB Insert Success");
    await sendEmail({
      email: process.env.SMTP_MAIL,
      subject: `📩 New Contact Message: ${subject}`,
      message: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Subject</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Message</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${message}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Received At</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>`,
    });
    console.log("Step 3 - Admin Email Sent ✅");
    await sendEmail({
      email,
      subject: " We Received Your Message — ShopMate",
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${name}! 👋</h2>
          <p>Thanks for reaching out to <strong>ShopMate</strong>. We've received your message and will get back to you within 24 hours.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Your Message:</strong></p>
            <p style="color: #555;">${message}</p>
          </div>
          <p>If you have any urgent queries, feel free to call us at <strong>+1 (555) 123-4567</strong>.</p>
          <br/>
          <p>Best Regards,</p>
          <strong>Team ShopMate 🛍️</strong>
        </div>
      `,
    });
    console.log("Step 4 - User Email Sent ✅");
    res.status(200).json({
      success: true,
      message: "Message send Successfully",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};
module.exports = sendContactMessage;
