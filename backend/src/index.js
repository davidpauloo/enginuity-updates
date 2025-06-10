// backend/src/index.js (UPDATED TO BE THE PRIMARY SERVER SETUP)
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import http from 'http'; // <--- NEW: Import http module for creating the server

import cloudConvertRoutes from "./routes/cloudConvert.route.js";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.routes.js";
import projectRoutes from "./routes/project.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import itemRoutes from "./routes/item.routes.js";
import payrollRecordRoutes from "./routes/payrollRecord.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";

// <--- CHANGE: Import a function to initialize socket.io, not 'app' and 'server' directly
import { initSocketServer } from "./lib/socket.js"; // We'll modify socket.js to export initSocketServer

dotenv.config();

const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize Express app and HTTP server here
const app = express();
const server = http.createServer(app); // <--- NEW: Create the server by passing the app

// 2. Apply all Express middleware to 'app' first
app.use(express.json());
app.use(cookieParser());

// Define allowed origins for BOTH HTTP API and Socket.IO
const allowedOrigins = [
  'http://localhost:5173',           // Your local frontend
  'https://enguinity-9.onrender.com' // Your live frontend URL
];

// Apply the main CORS middleware to Express app. This MUST be before routes.
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/payroll-records", payrollRecordRoutes);
app.use("/api/payrolls", payrollRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV === "production") {
    const frontendDistPath = path.join(__dirname, "../frontend/chat-front-end/dist");
    app.use(express.static(frontendDistPath));

    app.get("*", (req, res) => {
        res.sendFile(path.join(frontendDistPath, "index.html"));
    });
}

// 3. Initialize Socket.IO server by passing the configured HTTP server
initSocketServer(server, allowedOrigins); // <--- NEW: Call the function from socket.js and pass allowedOrigins

server.listen(PORT, () => {
    console.log("server is running on PORT:" + PORT);
    connectDB();
});