// src/routes/dev.routes.js
import express from "express";
import { sendWelcomeCredentials } from "../lib/mailer.js";

const router = express.Router();

router.post("/test-email", async (req, res) => {
  try {
    const to = req.body.to;
    if (!to) return res.status(400).json({ message: "to is required" });
    await sendWelcomeCredentials({
      to,
      fullName: "Test User",
      email: to,
      tempPassword: "Temp123!@#",
      role: "project_manager",
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
