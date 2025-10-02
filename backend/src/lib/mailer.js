import nodemailer from "nodemailer";

// Read env with sensible defaults for Gmail
const {
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "587",
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

/*
console.log("SMTP debug:", {
  host: SMTP_HOST,
  port: SMTP_PORT,
  user: SMTP_USER,
  from: MAIL_FROM,
});
*/
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
    console.log("Verifying SMTP connection...");
    await mailer.verify();
    console.log("SMTP connection verified");
    
    console.log(`Attempting to send email to: ${to}`);
    const info = await mailer.sendMail({
      from: resolveFrom(),
      to,
      subject,
      text,
      html,
    });
    
    console.log("Email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
    
    return info;
  } catch (error) {
    console.error("DETAILED EMAIL ERROR:", {
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
export async function sendWelcomeCredentials({ to, fullName, username, tempPassword, role }) {
  const subject = "Your Enginuity account credentials";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;max-width:600px">
      <h2 style="margin:0 0 8px;color:#1976d2">Welcome to Enginuity</h2>
      <p style="margin:0 0 12px;font-size:16px">Hello ${fullName || "there"}, your ${role === "project_manager" ? "Project Manager" : role === "client" ? "Client" : "user"} account has been created.</p>
      
      <div style="background:#f6f8fa;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #1976d2">
        <div style="margin-bottom:12px">
          <strong style="display:block;margin-bottom:4px;color:#424242">Username:</strong>
          <code style="background:#fff;padding:8px 12px;border-radius:4px;display:inline-block;font-size:15px;color:#d32f2f;font-weight:600">${username}</code>
        </div>
        <div>
          <strong style="display:block;margin-bottom:4px;color:#424242">Temporary Password:</strong>
          <code style="background:#fff;padding:8px 12px;border-radius:4px;display:inline-block;font-size:15px;color:#d32f2f;font-weight:600">${tempPassword}</code>
        </div>
      </div>
      
      <div style="background:#fff3e0;padding:12px 16px;border-radius:8px;margin:16px 0;border-left:4px solid #ff9800">
        <p style="margin:0;color:#e65100;font-weight:500">
          <strong>Important:</strong> Please sign in using your <strong>username</strong> (not your email address) and change your password immediately for security.
        </p>
      </div>
      
      <p style="margin:16px 0 8px;font-size:14px;color:#666">
        ${role === "client" ? "Use the Enginuity mobile app to sign in." : "Sign in at the Enginuity web portal."}
      </p>
      
      <p style="margin:16px 0;font-size:13px;color:#999;border-top:1px solid #eee;padding-top:12px">
        This email was sent to: ${to}
      </p>
    </div>
  `;
  
  const text = `
Welcome to Enginuity

Hello ${fullName || "there"}, your ${role === "project_manager" ? "Project Manager" : role === "client" ? "Client" : "user"} account has been created.

Username: ${username}
Temporary Password: ${tempPassword}

IMPORTANT: Please sign in using your USERNAME (not your email address) and change your password immediately for security.

${role === "client" ? "Use the Enginuity mobile app to sign in." : "Sign in at the Enginuity web portal."}

This email was sent to: ${to}
  `;
  
  return sendMail({ to, subject, html, text });
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