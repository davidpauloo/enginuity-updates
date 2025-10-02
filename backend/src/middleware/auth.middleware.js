// middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import SuperAdmin from "../models/superAdmin.model.js";

/**
  Verifies JWT from cookie or Authorization header (for mobile),
  loads the principal (SuperAdmin or User), enforces platform policy,
  and invalidates sessions if password changed after token issuance.
 */
const protectRoute = async (req, res, next) => {
  try {
    // ⭐ MODIFIED: Check both cookie and Authorization header
    let token = req.cookies?.token;
    
    // If no cookie, check Authorization header (for mobile)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load principal based on token userType
    let principal;
    if (decoded.userType === "superadmin") {
      principal = await SuperAdmin.findById(decoded.userId);
      if (!principal) {
        return res.status(401).json({ message: "Not authorized, token failed" });
      }
      req.user = { ...principal.toObject(), role: "superadmin" };
    } else {
      principal = await User.findById(decoded.userId);
      if (!principal) {
        return res.status(401).json({ message: "Not authorized, token failed" });
      }
      req.user = principal;
    }

    // Normalize platform for downstream checks
    req.platform = decoded.platform || "web";
    req.userType = decoded.userType || (decoded.userType === "superadmin" ? "superadmin" : "user");

    // Enforce policy: block clients on web
    if (req.platform === "web" && req.user?.role === "client") {
      return res.status(403).json({ message: "Access denied for client on web" });
    }

    // Invalidate session if password changed after token was issued
    const issuedAtSec = decoded.iat;
    const entity = req.user;
    if (entity && typeof entity.changedPasswordAfter === "function") {
      if (entity.changedPasswordAfter(issuedAtSec)) {
        return res.status(401).json({ message: "Session expired. Please login again." });
      }
    } else if (entity?.passwordChangedAt) {
      const pwdChangedAtSec = Math.floor(new Date(entity.passwordChangedAt).getTime() / 1000);
      if (pwdChangedAtSec > issuedAtSec) {
        return res.status(401).json({ message: "Session expired. Please login again." });
      }
    }

    return next();
  } catch (error) {
    console.error("❌ Error in protectRoute:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

/**
 * Test helper: injects a mock Super Admin user without JWT, for local dev only.
 */
const protectRouteTest = (req, res, next) => {
  req.user = { _id: "testid123", role: "superadmin", fullName: "Test SuperAdmin" };
  req.userType = "superadmin";
  req.platform = "web";
  console.log("✅ Mock user injected:", req.user);
  next();
};

export { protectRoute, protectRouteTest };