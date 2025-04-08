// Test email functionality
const nodemailer = require("nodemailer");

// Gmail credentials - replace with your actual Gmail account for testing
const GMAIL_USER = "reuben0548292827@gmail.com";
const GMAIL_PASS = "bwpp vzzy yvju scbk";

// Enable verbose logging
process.env.NODE_DEBUG = "mail,smtp,net,tls";

async function testEmail() {
  console.log("Testing email functionality...");
  console.log("Gmail credentials:");
  console.log("User:", GMAIL_USER);
  console.log(
    "Password:",
    GMAIL_PASS ? "(password is set)" : "(password is missing)"
  );

  try {
    // Create transporter with direct Gmail settings
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
      debug: true, // Enable debugging
    });

    // Verify connection
    console.log("Verifying SMTP connection...");
    const verification = await transporter.verify();
    console.log("SMTP connection verified:", verification);

    // Send test email
    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: `"Postmore App" <${GMAIL_USER}>`,
      to: "reuben0548292827@gmail.com", // Use your own email for testing
      subject: "Test Email from Postmore",
      text: "This is a test email to verify that email sending is working correctly.",
      html: "<p>This is a <b>test email</b> to verify that email sending is working correctly.</p>",
    });

    console.log("Email sent successfully!");
    console.log("Message ID:", info.messageId);

    // If using ethereal, show URL to view message
    if (nodemailer.getTestMessageUrl(info)) {
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    console.error("Error details:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
  }
}

testEmail().catch((error) => {
  console.error("Unhandled error:", error);
});
