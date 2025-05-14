import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url'; // For ES module __dirname equivalent

import { connectDB } from "./lib/db.js";
import authRoutes from  "./routes/auth.route.js";
import messageRoutes from "./routes/message.routes.js";
import projectRoutes from "./routes/project.routes.js";
import { app, server } from "./lib/socket.js";

dotenv.config();


const PORT = process.env.PORT || 5001; // Added a fallback port

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json()); // Middleware to parse JSON bodies
app.use(cookieParser()); // Middleware to parse cookies

// CORS configuration
app.use(cors({
    origin: "http://localhost:5173", // Your frontend URL
    credentials: true, // Allow cookies to be sent
  })
);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/projects", projectRoutes);

// --- ADD THIS FOR SERVING UPLOADED FILES LOCALLY ---
// This makes files in the 'uploads' directory in your backend's root accessible via '/uploads' URL path
// For example, a file at 'backend/uploads/project_documents/image.jpg'
// would be accessible at 'http://localhost:5001/uploads/project_documents/image.jpg'
// Ensure the 'uploads' directory exists at the root of your backend project.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Note: If your index.js is in a 'src' subfolder, and 'uploads' is at the project root,
// the path might need to be path.join(__dirname, '../../uploads') or similar.
// Adjust path.join(__dirname, '../uploads') based on your actual project structure
// if index.js is inside a 'src' folder and 'uploads' is at the project root.
// Assuming 'uploads' is one level up from the directory containing 'index.js' if index.js is in 'src'.
// If 'index.js' is at the root, it would be path.join(__dirname, 'uploads').
// For now, I'm assuming index.js is in 'src' and 'uploads' is at the backend project root.
// A common structure:
// backend/
// |- src/
// |  |- index.js
// |  |- routes/
// |  |- controllers/
// |  +- lib/
// |- uploads/  <-- This is what you want to serve
// In this case, path.join(__dirname, '../uploads') is correct.

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  // Path to the frontend build directory
  const frontendDistPath = path.join(__dirname, "../frontend/chat-front-end/dist");
  app.use(express.static(frontendDistPath));

  // For any other GET request not handled by API routes, serve the frontend's index.html
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

server.listen(PORT, () =>  {
    console.log("server is running on PORT:" + PORT);
    connectDB(); // Attempt to connect to DB
});
