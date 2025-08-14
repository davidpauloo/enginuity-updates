// backend/src/lib/socket.js (FIXED VERSION)
import { Server } from "socket.io";

let io; // Declare io globally but don't initialize here
// IMPORTANT: Move userSocketMap to global scope so getReceiverSocketId can access it
const userSocketMap = {}; // {userId: socketId} - used to store online users

// This function will be called from index.js to initialize Socket.IO
export function initSocketServer(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    console.log("🔍 User ID from handshake:", userId);
    
    if (userId && userId !== "undefined") {
      userSocketMap[userId] = socket.id;
      console.log(`👤 User ${userId} mapped to socket ${socket.id}`);
      console.log("🗺️ Current userSocketMap:", userSocketMap);
    }

    // Emit updated online users list
    const onlineUsers = Object.keys(userSocketMap);
    console.log("👥 Broadcasting online users:", onlineUsers);
    io.emit("getOnlineUsers", onlineUsers);

    socket.on("disconnect", () => {
      console.log("🔌 User disconnected", socket.id);
      
      // Find and remove the user from userSocketMap
      for (const key in userSocketMap) {
        if (userSocketMap[key] === socket.id) {
          delete userSocketMap[key];
          console.log(`👤 User ${key} removed from mapping`);
          break;
        }
      }
      
      console.log("🗺️ Updated userSocketMap:", userSocketMap);
      
      // Emit updated online users list
      const onlineUsers = Object.keys(userSocketMap);
      console.log("👥 Broadcasting updated online users:", onlineUsers);
      io.emit("getOnlineUsers", onlineUsers);
    });

    socket.on("chatMessage", (messageData) => {
      console.log("📨 Received chat message:", messageData);
      // You would typically process messageData (e.g., save to DB)
      // Then emit it to the intended receiver or broadcast
      // io.to(getReceiverSocketId(messageData.receiverId)).emit("newMessage", messageData);
    });
  });
}

// Now getReceiverSocketId can properly access userSocketMap
export function getReceiverSocketId(userId) {
  console.log(`🔍 Looking for socket ID for user: ${userId}`);
  console.log("🗺️ Available users in map:", Object.keys(userSocketMap));
  const socketId = userSocketMap[userId];
  console.log(`🎯 Found socket ID: ${socketId}`);
  return socketId;
}

// Export io for direct usage by other modules (e.g., for emitting from routes)
export { io };