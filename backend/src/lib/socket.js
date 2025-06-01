// backend/src/lib/socket.js (CLEANED UP AND CORRECTED)
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express(); // Initialize app here
const server = http.createServer(app); // Create server with this app

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // Ensure this matches your frontend URL
    methods: ["GET", "POST"], // Recommended to specify methods for Socket.IO CORS
    credentials: true // Important if you're using cookies/sessions
  },
});

// IMPORTANT: Declare userSocketMap BEFORE any function that uses it
const userSocketMap = {}; // {userId: socketId} - used to store online users

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  // Get userId from handshake query (e.g., from client-side `io(URL, { query: { userId: '...' } })`)
  const userId = socket.handshake.query.userId;
  
  // Only add if userId exists (prevents undefined keys)
  if (userId) {
      userSocketMap[userId] = socket.id;
  }

  // Emit the list of currently online user IDs to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    
    // Find and remove the disconnected user's socket ID from the map
    // We iterate because the userId might not be directly available in the disconnect scope
    // if `userId` was undefined during connection.
    for (const key in userSocketMap) {
        if (userSocketMap[key] === socket.id) {
            delete userSocketMap[key];
            console.log(`User ${key} disconnected.`);
            break; 
        }
    }
    
    // Re-emit the updated list of online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // Example of a custom event listener (you can add more as needed for your chat app)
  socket.on("chatMessage", (messageData) => {
    console.log("Received chat message:", messageData);
    // You would typically process messageData (e.g., save to DB)
    // Then emit it to the intended receiver or broadcast
    // io.to(getReceiverSocketId(messageData.receiverId)).emit("newMessage", messageData);
  });
});

export { io, app, server }; // Export app, io, and server