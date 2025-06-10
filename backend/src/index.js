// backend/src/index.js (ORIGINAL, CORRECT VERSION)
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import cloudConvertRoutes from "./routes/cloudConvert.route.js";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.routes.js";
import projectRoutes from "./routes/project.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import itemRoutes from "./routes/item.routes.js";
import payrollRecordRoutes from "./routes/payrollRecord.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";

import { app, server } from "./lib/socket.js"; // This import is crucial

dotenv.config();

const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());


// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/payroll-records", payrollRecordRoutes);
app.use("/api/payrolls", payrollRoutes);


app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const allowedOrigins = [
  'http://localhost:5173', // Your local frontend
  'https://enguinity-9.onrender.com' // Your future live frontend URL
];
// --------------

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

if (process.env.NODE_ENV === "production") {
    const frontendDistPath = path.join(__dirname, "../frontend/chat-front-end/dist");
    app.use(express.static(frontendDistPath));

    app.get("*", (req, res) => {
        res.sendFile(path.join(frontendDistPath, "index.html"));
    });
}

server.listen(PORT, () => {
    console.log("server is running on PORT:" + PORT);
    connectDB();
});