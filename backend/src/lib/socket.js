import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Global references
let io;
// userId -> Set<socketId> (multi-tabs/devices)
const userSockets = new Map(); // Map<string, Set<string>>

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}
function removeUserSocket(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}
function allOnlineUserIds() {
  return Array.from(userSockets.keys());
}

// Parse JWT from handshake (auth.token preferred; cookie fallback)
function authenticateSocket(socket) {
  try {
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.cookie?.match(/token=([^;]+)/)?.[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId || decoded?.id;
    return userId ? String(userId) : null;
  } catch {
    return null;
  }
}

export function initSocketServer(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const jwtUserId = authenticateSocket(socket);
    const queryUserId = socket.handshake?.query?.userId;
    const userId =
      jwtUserId ||
      (queryUserId && String(queryUserId) !== "undefined" ? String(queryUserId) : null);

    if (userId) {
      addUserSocket(userId, socket.id);
      socket.join(userId); // per-user room
      // DEBUG: log room join
      console.log("SOCKET JOIN -> user:", userId, "socket:", socket.id);
    }

    io.emit("getOnlineUsers", allOnlineUserIds());

    socket.on("disconnect", () => {
      if (userId) removeUserSocket(userId, socket.id);
      io.emit("getOnlineUsers", allOnlineUserIds());
    });

    // Optional relay if clients send messages via socket transport
    socket.on("chatMessage", (payload) => {
      const to = String(payload?.receiverId || "");
      if (!to) return;
      io.to(to).emit("message:received", payload);
    });
  });
}

// Emit to all sockets of a specific user
export function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  // DEBUG: log emit target + payload receiver
  const payloadReceiver = String(
    typeof data?.receiverId === "object" ? data.receiverId?._id : data?.receiverId || ""
  );
  console.log("EMIT ->", event, "to user:", String(userId), "payload.receiverId:", payloadReceiver);
  io.to(String(userId)).emit(event, data);
}

// Legacy helper (single socket id)
export function getReceiverSocketId(userId) {
  const set = userSockets.get(String(userId));
  if (!set || set.size === 0) return undefined;
  return Array.from(set)[0];
}

export { io };
