// src/store/useAuthStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { io } from "socket.io-client";

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
    if (!authUser || get().socket?.connected) {
      console.log("🔌 Socket connection skipped:", { 
        hasAuthUser: !!authUser, 
        socketConnected: get().socket?.connected 
      });
      return;
    }

    console.log("🔌 Connecting to socket with user ID:", authUser._id);
    console.log("🔌 Socket URL:", API_AND_SOCKET_BASE_URL);

    const socket = io(API_AND_SOCKET_BASE_URL, {
      query: {
        userId: authUser._id,
      },
      transports: ['websocket', 'polling'],
    });

    set({ socket: socket });

    // Socket event listeners
    socket.on("connect", () => {
      console.log("✅ Connected to socket server:", socket.id);
    });

    socket.on("getOnlineUsers", (userIds) => {
      console.log("👥 Online users received:", userIds);
      set({ onlineUsers: userIds });
    });

    // 🚨 MISSING EVENT LISTENER - This is what was causing the issue!
    socket.on("newMessage", (newMessage) => {
      console.log("📨 New message received via socket:", newMessage);
      
      // You need to update your chat messages here
      // If you have a separate chat store, you should call it here
      // For now, we'll just log it and you can integrate with your chat store
      
      // Example: If you have a useChatStore, you would do:
      // const { addMessage } = useChatStore.getState();
      // addMessage(newMessage);
      
      // For now, let's trigger a browser notification or toast
      toast.success(`New message from ${newMessage.senderId}`);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
      console.error("❌ Full error:", err);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      set({ socket: null, onlineUsers: [] });
    });
  },

  disconnectSocket: () => {
    const currentSocket = get().socket;
    if (currentSocket?.connected) {
      console.log("🔌 Disconnecting socket");
      currentSocket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));