// backend/src/lib/socket.js (MODIFIED FOR EXTERNAL SERVER INITIALIZATION)
import { Server } from "socket.io";

let io; // Declare io globally but don't initialize here

// This function will be called from index.js to initialize Socket.IO
// It accepts the http server and the allowedOrigins list for Socket.IO's internal CORS
export function initSocketServer(httpServer, allowedOrigins) {
  io = new Server(httpServer, { // Use the passed httpServer
    cors: {
      origin: allowedOrigins, // <--- Use the same allowedOrigins for Socket.IO
      methods: ["GET", "POST"], // Recommended to specify methods for Socket.IO CORS
      credentials: true // Important if you're using cookies/sessions
    },
  });

  // IMPORTANT: Declare userSocketMap BEFORE any function that uses it
  const userSocketMap = {}; // {userId: socketId} - used to store online users

  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap[userId] = socket.id;
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      console.log("A user disconnected", socket.id);
      for (const key in userSocketMap) {
        if (userSocketMap[key] === socket.id) {
          delete userSocketMap[key];
          console.log(`User ${key} disconnected.`);
          break;
        }
      }
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    socket.on("chatMessage", (messageData) => {
      console.log("Received chat message:", messageData);
      // You would typically process messageData (e.g., save to DB)
      // Then emit it to the intended receiver or broadcast
      // io.to(getReceiverSocketId(messageData.receiverId)).emit("newMessage", messageData);
    });
  });
}

// Export getReceiverSocketId if it's used elsewhere
export function getReceiverSocketId(userId) {
  // Ensure userSocketMap is properly scoped if accessed globally outside initSocketServer
  // For simplicity, if getReceiverSocketId is only called after initSocketServer, this is fine.
  // Otherwise, userSocketMap might need to be a global or returned from initSocketServer.
  return userSocketMap[userId];
}

// Only export io itself for direct usage if needed by other modules (e.g., for emitting from routes)
export { io };