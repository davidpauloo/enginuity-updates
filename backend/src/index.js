import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import { connectDB } from "./lib/db.js";
import createSuperAdmin from "./lib/createSuperAdmin.js";
import { initSocketServer } from "./lib/socket.js";

// Routes
import authRoutes from "./routes/auth.route.js";
import adminRoutes from "./routes/admin.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import projectRoutes from "./routes/project.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import itemRoutes from "./routes/item.routes.js";
import payrollRecordRoutes from "./routes/payrollRecord.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import projectManagerRoutes from "./routes/projectManager.routes.js";
import devRoutes from "./routes/dev.routes.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Core middleware
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// CORS with credentials
const allowedOrigins = [
  "http://localhost:5173",
  "https://enguinity-9.onrender.com",
];
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // allow server-to-server/local tools
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS: origin not allowed"), false);
    },
    credentials: true,
  })
);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API Routes
app.use("/api/auth", authRoutes);         // login, forgot, self password change
app.use("/api/admin", adminRoutes);       // reset requests + accounts CRUD
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/payroll-records", payrollRecordRoutes);
app.use("/api/payrolls", payrollRoutes);
app.use("/api/pm", projectManagerRoutes);

// Dev route (remove in production)
app.use("/api/dev", devRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const frontendDistPath = path.join(__dirname, "../frontend/chat-front-end/dist");
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

// Startup
const startServer = async () => {
  try {
    await connectDB();
    await createSuperAdmin();
    console.log("✅ Superadmin check/creation complete");

    initSocketServer(server, allowedOrigins);

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error during server startup:", err.message);
    process.exit(1);
  }
};

startServer();
