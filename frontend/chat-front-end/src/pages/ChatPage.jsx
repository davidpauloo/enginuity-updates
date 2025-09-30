import { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

const ChatPage = () => {
  const [users, setUsers] = useState([]); // users enriched with lastActivity
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // helper: bump a user's lastActivity to the given ISO/date
  const bumpUserActivity = useCallback((userId, when = new Date().toISOString()) => {
    setUsers((prev) =>
      prev.map((u) =>
        u?._id === userId ? { ...u, lastActivity: when } : u
      )
    );
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch(`${API_BASE}/api/messages/users`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        const clone = res.clone();
        let data;
        try {
          data = await res.json();
        } catch (e) {
          const text = await clone.text();
          console.error("❌ Non-JSON response for /users:", res.status, text);
          throw new Error(`Failed to parse users (${res.status})`);
        }

        if (!res.ok) {
          const msg = data?.message || data?.error || "Failed to load users";
          throw new Error(msg);
        }

        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        // initialize lastActivity with 0-date to allow later bumps
        const enriched = list.map((u) => ({ ...u, lastActivity: u.lastActivity || u.updatedAt || u.createdAt || null }));
        setUsers(enriched);
      } catch (err) {
        toast.error(err.message || "Failed to load users");
        setUsers([]);
      } finally {
        if (active) setLoadingUsers(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // keep selection valid if users list changes
  useEffect(() => {
    if (!selectedUser) return;
    const stillThere = users.some((u) => u?._id === selectedUser?._id);
    if (!stillThere) setSelectedUser(null);
  }, [users, selectedUser]);

  // called by ChatContainer when a thread is fetched so we can bump sidebar
  const onThreadLoaded = useCallback((userId, latestCreatedAt) => {
    if (!userId || !latestCreatedAt) return;
    bumpUserActivity(userId, latestCreatedAt);
  }, [bumpUserActivity]);

  // called by ChatContainer right after a successful send
  const onMessageSent = useCallback((userId, createdAtISO) => {
    bumpUserActivity(userId, createdAtISO || new Date().toISOString());
  }, [bumpUserActivity]);

  const sidebarProps = useMemo(
    () => ({
      users,
      selectedUser,
      onSelectUser: setSelectedUser,
      loading: loadingUsers,
    }),
    [users, selectedUser, loadingUsers]
  );

  return (
    <div className="h-[calc(100vh-64px)] flex bg-base-100">
      <Sidebar {...sidebarProps} />
      <ChatContainer
        selectedUser={selectedUser}
        onThreadLoaded={onThreadLoaded}
        onMessageSent={onMessageSent}
      />
    </div>
  );
};

export default ChatPage;
