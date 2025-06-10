// src/store/useAuthStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { io } from "socket.io-client";

// Correctly determine the base URL using an environment variable
// In your local .env file (frontend/chat-front-end/.env):
// VITE_APP_API_URL=http://localhost:5001
//
// In Render's environment variables for your frontend service:
// VITE_APP_API_URL=https://enguinity-5.onrender.com
const API_AND_SOCKET_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    // Prevent connecting if already connected or no authUser
    if (!authUser || get().socket?.connected) return;

    // Use the dynamically set base URL for Socket.IO connection
    const socket = io(API_AND_SOCKET_BASE_URL, {
      query: {
        userId: authUser._id,
      },
      transports: ['websocket', 'polling'], // Recommended for better cross-environment compatibility
    });
    // socket.connect() is often redundant here as io() usually connects immediately.
    // If you explicitly call socket.connect() it's fine, but often not strictly needed.

    set({ socket: socket });

    // Socket event listeners
    socket.on("getOnlineUsers", (userIds) => {
      console.log("Online users received:", userIds);
      set({ onlineUsers: userIds });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      // Optional: Display a user-friendly toast message for connection errors
      // toast.error(`Socket connection failed: ${err.message}`);
    });
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      // Optional: Handle re-connection logic or notify user
      set({ socket: null, onlineUsers: [] }); // Clear state on disconnect
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) {
      get().socket.disconnect();
      set({ socket: null, onlineUsers: [] }); // Clear state on manual disconnect
    }
  },
}));