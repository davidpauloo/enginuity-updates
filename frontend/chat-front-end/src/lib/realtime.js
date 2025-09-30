import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

// Create one shared Socket.IO client for the app
export const socket = io(API_BASE, {
  withCredentials: true,
  // Preferred: send JWT via auth if accessible
  // auth: { token: getCookie('token') },
  // Dev fallback: you may add query: { userId } if the server expects it
});

// Optional helpers for consistency
export const onMessageReceived = (handler) => socket.on("message:received", handler);
export const offMessageReceived = (handler) => socket.off("message:received", handler);
