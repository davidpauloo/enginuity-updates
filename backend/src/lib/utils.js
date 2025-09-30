// backend/src/lib/utils.js
import jwt from "jsonwebtoken";

/**
 * Signs a JWT and sets it as an HttpOnly cookie on the response.
 * Includes userId, userType (role), and platform ("web" | "mobile") claims.
 *
 * @param {string} userId
 * @param {import('express').Response} res
 * @param {string} userType - e.g. "superadmin" | "project_manager" | "client"
 * @param {string} platform - "web" | "mobile"
 * @param {object} opts - optional overrides
 */
export const generateToken = (
  userId,
  res,
  userType = "user",
  platform = "web",
  opts = {}
) => {
  const {
    expiresIn = "15d",           // token lifetime
    cookieName = "token",        // cookie name
    cookieMaxAgeMs = 15 * 24 * 60 * 60 * 1000, // 15 days
    sameSite = "Lax",            // Lax balances UX and CSRF protection
    path = "/",                  // send cookie to entire site
  } = opts;

  const payload = { userId, userType, platform };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite,                    // "Strict" or "Lax"; prefer "Lax" for typical SPA flows
    maxAge: cookieMaxAgeMs,
    path,
  });

  return token;
};

/**
 * Helper to clear the auth cookie consistently.
 * Usage: clearAuthCookie(res)
 */
export const clearAuthCookie = (res, opts = {}) => {
  const { cookieName = "token", path = "/" } = opts;
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path,
  });
};

/**
 * UI helper used by the frontend server-rendered views only.
 * Keep frontend React app free of JWT imports; do not import jsonwebtoken in the browser.
 */
export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
