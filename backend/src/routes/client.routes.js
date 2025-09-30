import express from "express";
import User from "../models/user.model.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create client (superadmin only)
router.post("/", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Super admin only." });
    }

    const { fullName, email, contactNumber, location, description, startDate, endDate } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ message: "Full name and email are required." });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists." });

    const client = await User.create({
      fullName,
      email,
      password: Math.random().toString(36).slice(-10), // temp password
      contactNumber,
      location,
      description,
      startDate,
      endDate,
      role: "client",
      createdBy: req.user._id,
    });

    res.status(201).json(client);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ message: "Server error creating client", error: err.message });
  }
});

// Get all clients
router.get("/", protectRoute, async (req, res) => {
  try {
    const clients = await User.find({ role: "client" }).populate("createdBy", "fullName email");
    res.status(200).json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ message: "Server error fetching clients", error: err.message });
  }
});

// Get client by ID
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const client = await User.findOne({ _id: req.params.id, role: "client" }).populate(
      "createdBy",
      "fullName email"
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.status(200).json(client);
  } catch (err) {
    console.error("Error fetching client:", err);
    res.status(500).json({ message: "Server error fetching client", error: err.message });
  }
});

// Update client
router.put("/:id", protectRoute, async (req, res) => {
  try {
    const client = await User.findOneAndUpdate(
      { _id: req.params.id, role: "client" },
      req.body,
      { new: true }
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.status(200).json(client);
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ message: "Server error updating client", error: err.message });
  }
});

// Delete client
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const deleted = await User.findOneAndDelete({ _id: req.params.id, role: "client" });
    if (!deleted) return res.status(404).json({ message: "Client not found" });
    res.status(200).json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ message: "Server error deleting client", error: err.message });
  }
});

export default router;
