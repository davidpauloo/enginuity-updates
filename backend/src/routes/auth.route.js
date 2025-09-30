// routes/auth.routes.js
import express from "express";
import {
  signup,
  login,
  logout,
  updateProfile,
  checkAuth,
  updatePassword,
  forgotPassword,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword); // generic, no-email, queues admin request

// Protected
router.post("/logout", protectRoute, logout);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

// User update password (self-service while authenticated)
router.put("/password", protectRoute, updatePassword);

export default router;
