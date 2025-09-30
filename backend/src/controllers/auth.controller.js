// controllers/auth.controller.js
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import SuperAdmin from "../models/superAdmin.model.js";
import AdminResetRequest from "../models/adminResetRequest.model.js";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";

// ---------------------- SIGNUP (clients / PMs) ----------------------
export const signup = async (req, res) => {
  try {
    const { fullName, email, password, role, platform } = req.body; // platform optional here

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    // Model pre-save also hashes; keep exactly one hash:
    // Here we hash in controller because User pre-save already guards re-hash with isModified('password').
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isActive: true,
    });

    // token userType = role
    generateToken(newUser._id, res, role, platform || "web");

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.error("❌ Signup error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- LOGIN (all roles) ----------------------
export const login = async (req, res) => {
  try {
    const { email, password, platform } = req.body; // 'web' | 'mobile'
    if (!email || !password || !platform) {
      return res.status(400).json({ message: "email, password, and platform are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    console.log(`🔐 LOGIN ATTEMPT email=${normalizedEmail} platform=${platform}`);

    let user = null;
    let userRole = null;

    // 1) Try SuperAdmin collection first
    const sa = await SuperAdmin.findOne({ email: normalizedEmail, isActive: true });
    if (sa) {
      user = sa;
      userRole = "superadmin";
      console.log(`➡️ Auth path: SuperAdmin id=${user._id}`);
    }

    // 2) Fallback to User collection
    if (!user) {
      const u = await User.findOne({ email: normalizedEmail, isActive: true });
      if (u) {
        user = u;
        userRole = u.role;
        console.log(`➡️ Auth path: User(${userRole}) id=${user._id}`);
      }
    }

    if (!user) {
      // Avoid revealing whether email exists
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3) Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ message: "Account temporarily locked" });
    }

    // 4) Verify password via bcrypt
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }
      await user.save();
      return res.status(400).json({ message: "Username or password is wrong" });
    }

    // 5) Enforce platform policy: clients not allowed on web
    if (userRole === "client" && platform === "web") {
      return res.status(403).json({ message: "Client accounts can only sign in on mobile." });
    }

    // 6) Reset attempts and update last login (save only if changed)
    if (user.loginAttempts || user.lockedUntil || !user.lastLogin) {
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.lastLogin = new Date();
      await user.save();
    }

    // 7) Issue JWT cookie with role + platform
    generateToken(user._id, res, userRole, platform);

    // 8) Respond with minimal safe profile
    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: userRole,
      profilePic: user.profilePic,
      permissions: userRole === "superadmin" ? user.permissions : undefined,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- LOGOUT ----------------------
export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("❌ Logout error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- UPDATE PROFILE ----------------------
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ message: "Profile pic is required" });

    const upload = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: upload.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("❌ Update profile error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- CHECK AUTH ----------------------
export const checkAuth = (req, res) => {
  try {
    res.status(200).json({
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      profilePic: req.user.profilePic,
      role: req.userType || req.user.role,
      platform: req.platform || "web",
      permissions: req.userType === "superadmin" ? req.user.permissions : undefined,
      lastLogin: req.user.lastLogin,
    });
  } catch (error) {
    console.error("❌ Check auth error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- UPDATE PASSWORD (self-service when logged in) ----------------------
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>/?`~]).{8,}$/;

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New passwords do not match." });
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    // Determine whether this is a SuperAdmin or regular User
    let entity = null;
    if (req.userType === "superadmin") {
      entity = await SuperAdmin.findById(req.user._id);
    } else {
      entity = await User.findById(req.user._id);
    }

    if (!entity) {
      return res.status(404).json({ message: "User not found." });
    }

    const ok = await bcrypt.compare(currentPassword, entity.password);
    if (!ok) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    // Single hashing path: if model has pre-save hook, assign plaintext; else hash here
    entity.password = newPassword; // SuperAdmin & User models should hash in pre-save
    entity.loginAttempts = 0;
    entity.lockedUntil = null;

    await entity.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("❌ Update password error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- FORGOT PASSWORD (no email; queues admin request) ----------------------
export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body; // email or username if added later
    const generic = { message: "If the account exists, a reset request has been queued." };

    if (!identifier) return res.status(200).json(generic);

    const email = String(identifier).toLowerCase().trim();
    const user = await User.findOne({ email, isActive: true });

    if (user) {
      await AdminResetRequest.create({
        managerUserId: user._id, // can be generalized to userId later
        status: "pending",
        requestedAt: new Date(),
        notes: "Initiated via public forgot-password (no email).",
      });
    }

    return res.status(200).json(generic);
  } catch (error) {
    console.error("❌ Forgot password error:", error.message);
    return res.status(200).json({ message: "If the account exists, a reset request has been queued." });
  }
};

// ---------------------- SET SUPER ADMIN PASSWORD (authenticated SA only) ----------------------
export const setSuperAdminPassword = async (req, res) => {
  try {
    if (req.userType !== "superadmin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { newPassword, confirmNewPassword } = req.body;
    if (!newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "Both newPassword and confirmNewPassword are required." });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New passwords do not match." });
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    const sa = await SuperAdmin.findById(req.user._id);
    if (!sa || !sa.isActive) {
      return res.status(404).json({ message: "Super Admin not found." });
    }

    // Single hashing path: SuperAdmin model should hash on save
    sa.password = newPassword;
    sa.loginAttempts = 0;
    sa.lockedUntil = null;

    await sa.save();

    return res.status(200).json({ message: "Super Admin password updated." });
  } catch (error) {
    console.error("❌ setSuperAdminPassword error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
