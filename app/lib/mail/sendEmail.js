import nodemailer from "nodemailer";

/**
 * Configure the email transporter using environment variables
 */
const configureTransporter = async () => {
  // Check if Gmail credentials are available
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    console.log("Using Gmail SMTP for sending emails");
    console.log("Gmail User:", process.env.GMAIL_USER);
    console.log(
      "Gmail Pass:",
      process.env.GMAIL_PASS ? "(password is set)" : "(password is missing)"
    );

    return nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
      debug: true, // Enable debugging
    });
  } else if (
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASSWORD
  ) {
    // Fallback to generic SMTP configuration
    console.log(`Using SMTP server: ${process.env.EMAIL_HOST}`);
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else {
    // For development/testing without real credentials, use Ethereal (fake SMTP service)
    console.log("No email credentials found, using Ethereal for testing");
    const testAccount = await nodemailer.createTestAccount();

    console.log("Ethereal Email account for testing:", {
      user: testAccount.user,
      pass: testAccount.pass,
      web: "https://ethereal.email",
    });

    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
};

/**
 * Send an email
 * @param {Object} options - Email sending options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @returns {Promise<Object>} - Email sending info
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    console.log("Starting email sending process...");
    console.log("Email recipient:", to);
    console.log("Email subject:", subject);

    const transporter = await configureTransporter();

    // Verify connection configuration
    try {
      console.log("Verifying SMTP connection...");
      const verification = await transporter.verify();
      console.log("SMTP connection verified:", verification);
    } catch (verifyError) {
      console.error("SMTP verification error:", verifyError);
    }

    const fromEmail =
      process.env.EMAIL_FROM ||
      process.env.GMAIL_USER ||
      "postmore@example.com";
    const fromName = process.env.EMAIL_FROM_NAME || "Postmore App";

    console.log(`Sending email from: "${fromName}" <${fromEmail}>`);

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    // Log the preview URL when using Ethereal
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log("Email preview URL:", nodemailer.getTestMessageUrl(info));
    } else {
      console.log(`Email sent: ${info.messageId}`);
    }

    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    console.error("Email sending error:", error);
    console.error("Error details:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    return { success: false, error: error.message };
  }
};

/**
 * Send a password reset email
 * @param {Object} options - Password reset options
 * @param {string} options.email - Recipient email
 * @param {string} options.resetToken - Password reset token
 * @param {string} options.name - User's name (optional)
 * @returns {Promise<Object>} - Email sending info
 */
const sendPasswordResetEmail = async ({ email, resetToken, name = "" }) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/auth/recover-account/reset-password?code=${resetToken}&email=${encodeURIComponent(
    email
  )}`;

  const subject = "Reset Your Postmore Password";

  const greeting = name ? `Hello ${name},` : "Hello,";

  const text = `
${greeting}

You requested a password reset for your Postmore account. Please click the link below to reset your password:

${resetUrl}

This link will expire in 10 minutes. If you didn't request this, please ignore this email.

Thank you,
The Postmore Team
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .logo { text-align: center; margin-bottom: 20px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>Postmore</h1>
    </div>
    <p>${greeting}</p>
    <p>You requested a password reset for your Postmore account. Please click the button below to reset your password:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <p>Or copy and paste this URL into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
    <div class="footer">
      <p>Thank you,<br>The Postmore Team</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

export { sendEmail };
export default sendPasswordResetEmail;
