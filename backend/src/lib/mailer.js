import nodemailer from "nodemailer";

// Read env with sensible defaults for Gmail
const {
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "587",
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

// One-time debug so you can verify what's actually loaded
console.log("SMTP debug:", {
  host: SMTP_HOST,
  port: SMTP_PORT,
  user: SMTP_USER,
  from: MAIL_FROM,
});

let transporter;

/**
 * Ensure a valid RFC-5322 From header.
 * If MAIL_FROM is missing angle brackets, fall back to "Enginuity <SMTP_USER>".
 */
function resolveFrom() {
  const from = MAIL_FROM && MAIL_FROM.trim();
  if (from && from.includes("<") && from.includes(">")) return from;
  if (SMTP_USER) return `Enginuity <${SMTP_USER}>`;
  return "Enginuity <no-reply@enginuity.app>";
}

/**
 * Initialize and memoize a Nodemailer transporter for Gmail SMTP.
 * Requires a Gmail/Workspace account with 2FA and an App Password.
 */
export function getMailer() {
  if (transporter) return transporter;

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER/SMTP_PASS are required for Gmail mailer");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),           // 587 for STARTTLS, 465 for SSL
    secure: Number(SMTP_PORT) === 465, // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Add these for better debugging
    logger: true,
    debug: true,
  });

  return transporter;
}

/**
 * Generic send function with detailed error logging
 */
export async function sendMail({ to, subject, html, text }) {
  try {
    const mailer = getMailer();
    
    // Verify transporter before sending
    console.log("🔍 Verifying SMTP connection...");
    await mailer.verify();
    console.log("✅ SMTP connection verified");
    
    console.log(`📧 Attempting to send email to: ${to}`);
    const info = await mailer.sendMail({
      from: resolveFrom(),
      to,
      subject,
      text,
      html,
    });
    
    console.log("✅ Email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
    
    return info;
  } catch (error) {
    console.error("❌ DETAILED EMAIL ERROR:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    // Re-throw so the controller catch block can handle it
    throw error;
  }
}

/**
 * Send newly-created account credentials.
 */
export async function sendWelcomeCredentials({ to, fullName, email, tempPassword, role }) {
  const subject = "Your Enginuity account credentials";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">Welcome to Enginuity</h2>
      <p style="margin:0 0 12px">Hello ${fullName || "there"}, your ${role || "user"} account has been created.</p>
      <div style="background:#f6f8fa;padding:12px 14px;border-radius:8px;margin:8px 0 12px">
        <div>Email: <code>${email}</code></div>
        <div>Temporary password: <code>${tempPassword}</code></div>
      </div>
      <p style="margin:0 0 8px">Please sign in and change your password immediately.</p>
    </div>
  `;
  return sendMail({ to, subject, html });
}

/**
 * Send admin-fulfilled password reset notification.
 */
export async function sendAdminResetNotice({ to, fullName, tempPassword }) {
  const subject = "Your Enginuity password has been reset";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">Password reset</h2>
      <p style="margin:0 0 12px">Hello ${fullName || "there"}, your password was reset by an administrator.</p>
      <div style="background:#f6f8fa;padding:12px 14px;border-radius:8px;margin:8px 0 12px">
        <div>Temporary password: <code>${tempPassword}</code></div>
      </div>
      <p style="margin:0 0 8px">Use this password to sign in, then set a new one in Settings.</p>
    </div>
  `;
  return sendMail({ to, subject, html });
}