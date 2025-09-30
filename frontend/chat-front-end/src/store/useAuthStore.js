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

  // Update profile: supports multipart avatar and JSON field updates
  updateProfile: async (updates) => {
    const { authUser } = get();
    if (!authUser) {
      toast.error("Not authenticated");
      return;
    }

    // Accept one or two files: { file } or { file, coverFile }
    const hasFile = !!updates?.file;
    const hasCover = !!updates?.coverFile;
    const isMultipart = hasFile || hasCover;

    try {
      set({ isUpdatingProfile: true });

      let res;

      if (isMultipart) {
        // If backend updated to upload.fields for two files, send both.
        // Otherwise, fallback to separate requests (see below).
        const fd = new FormData();

        if (hasFile) {
          // MUST match backend field name
          fd.append("profilePic", updates.file);
        }
        if (hasCover) {
          // Backend must accept a second field (e.g., coverPhoto) via upload.fields
          fd.append("coverPhoto", updates.coverFile);
        }

        res = await axiosInstance.put("/users/profile/picture", fd, {
          // Let Axios infer boundary from FormData; header optional
          // headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });
      } else {
        // JSON-only profile updates
        const body = {};
        if (updates?.fullName) body.fullName = updates.fullName;
        if (updates?.name) body.name = updates.name;
        if (updates?.email) body.email = updates.email;
        if (updates?.phone) body.phone = updates.phone;
        if (updates?.bio) body.bio = updates.bio;
        if (updates?.profilePic) body.profilePic = updates.profilePic;

        res = await axiosInstance.put("/users/profile", body, {
          withCredentials: true,
        });
      }

      // Merge updated data into authUser
      const updated = res?.data?.user ?? res?.data ?? {};
      const current = get().authUser || {};
      const merged = { ...current, ...updated };

      // Ensure profilePic updated from direct avatar response
      if (isMultipart && res?.data?.profilePic) {
        merged.profilePic = res.data.profilePic;
      }
      // Optionally pick up coverPhoto URL if backend returns it
      if (isMultipart && res?.data?.coverPhoto) {
        merged.coverPhoto = res.data.coverPhoto;
      }

      set({ authUser: merged });
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Profile update failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Profile update failed";
      toast.error(msg);
      throw err;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch {
      try {
        const res = await axiosInstance.get("/superadmin-auth/check");
        set({ authUser: res.data });
        get().connectSocket();
      } catch {
        try {
          const res = await axiosInstance.get("/projectmanager-auth/check");
          set({ authUser: res.data });
          get().connectSocket();
        } catch {
          try {
            const res = await axiosInstance.get("/client-auth/check");
            set({ authUser: res.data });
          } catch (error) {
            set({ authUser: null });
          }
        }
      }
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
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    let loginSuccessful = false;
    let user = null;

    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      user = res.data;
      loginSuccessful = true;
    } catch (error) {
      try {
        const res = await axiosInstance.post("/superadmin-auth/login", data);
        set({ authUser: res.data });
        user = res.data;
        loginSuccessful = true;
      } catch (superAdminErr) {
        try {
          const res = await axiosInstance.post(
            "/projectmanager-auth/login",
            data
          );
          set({ authUser: res.data });
          user = res.data;
          loginSuccessful = true;
        } catch (projectManagerErr) {
          try {
            const res = await axiosInstance.post("/client-auth/login", data);
            set({ authUser: res.data });
            user = res.data;
            loginSuccessful = true;
          } catch (clientErr) {
            const errorMessage =
              clientErr.response?.data?.message ||
              projectManagerErr.response?.data?.message ||
              superAdminErr.response?.data?.message ||
              error.response?.data?.message ||
              "Login failed";
            toast.error(errorMessage);
          }
        }
      }
    } finally {
      set({ isLoggingIn: false });
      if (loginSuccessful) {
        toast.success("Logged in successfully");
        get().connectSocket();
        return user;
      }
    }
  },

  logout: async () => {
    try {
      const currentUser = get().authUser;

      if (currentUser) {
        if (currentUser.role === "superadmin") {
          try {
            await axiosInstance.post("/superadmin-auth/logout");
          } catch (error) {
            console.error("SuperAdmin logout failed:", error);
          }
        } else if (currentUser.role === "project_manager") {
          try {
            await axiosInstance.post("/projectmanager-auth/logout");
          } catch (error) {
            console.error("Project Manager logout failed:", error);
          }
        } else if (currentUser.role === "client") {
          try {
            await axiosInstance.post("/client-auth/logout");
          } catch (error) {
            console.error("Client logout failed:", error);
          }
        } else {
          try {
            await axiosInstance.post("/auth/logout");
          } catch (error) {
            console.error("User logout failed:", error);
          }
        }
      }

      set({ authUser: null });
      get().disconnectSocket();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      set({ authUser: null });
      get().disconnectSocket();
      toast.success("Logged out successfully");
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;

    const socket = io(API_AND_SOCKET_BASE_URL, {
      query: { userId: authUser._id },
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Socket connected", socket.id, "user:", authUser._id);
    });

    socket.on("getOnlineUsers", (users) => {
      set({ onlineUsers: users });
    });

    socket.on("message:received", (p) => {
      const rid =
        typeof p?.receiverId === "object"
          ? p?.receiverId?._id
          : p?.receiverId;
      console.log(
        "[store] message:received -> socket:",
        socket.id,
        "receiverId:",
        rid,
        "mine:",
        authUser._id
      );
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));
