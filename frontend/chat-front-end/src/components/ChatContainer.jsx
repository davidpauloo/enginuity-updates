import { useEffect, useState } from "react";
import NoChatSelected from "./NoChatSelected";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import { useAuthStore } from "../store/useAuthStore";

const ChatMessage = ({ meId, msg }) => {
  const sender = msg?.senderId;
  const me = String(meId || "");
  const sid = typeof sender === "object" ? String(sender?._id || "") : String(sender || "");
  const isMine = me && sid && me === sid;

  // DEBUG: Log comparison details
  console.log("ChatMessage Debug:", {
    meId,
    meString: me,
    senderRaw: sender,
    senderIdString: sid,
    isMine,
    messageText: msg?.text
  });

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "inline-block w-fit",
          "max-w-[min(70ch,70%)]",
          "whitespace-pre-wrap break-words",
          "px-3 py-2 rounded-md",
          isMine ? "bg-primary text-primary-content" : "bg-base-200",
        ].join(" ")}
      >
        {msg?.text || ""}
      </div>
    </div>
  );
};

const MessagesList = ({ meId, messages }) => {
  return (
    <div className="flex-1 overflow-auto p-4 space-y-2">
      {messages?.length === 0 && (
        <div className="text-sm text-base-content/60">No messages yet.</div>
      )}
      {messages?.map((m) => (
        <ChatMessage key={m._id || `${m.senderId}-${m.createdAt}`} meId={meId} msg={m} />
      ))}
    </div>
  );
};

const ChatContainer = ({ selectedUser, onThreadLoaded, onMessageSent }) => {
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Get authenticated user from store - FIX: it's 'authUser' not 'user'
  const currentUser = useAuthStore((s) => s.authUser);
  const socket = useAuthStore((s) => s.socket);
  const meId = currentUser?._id;

  // DEBUG: Log user info
  console.log("Current User from Store:", {
    fullUser: currentUser,
    meId: meId,
    meIdType: typeof meId
  });

  // Load conversation whenever selection changes
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!selectedUser?._id) {
        setMessages([]);
        return;
      }
      setLoadingMsgs(true);
      try {
        const res = await fetch(`/api/messages/${selectedUser._id}`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(`Load messages failed ${res.status}: ${res.statusText} ${errText}`);
          if (active) setMessages([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        
        // DEBUG: Log messages structure
        console.log("Messages loaded:", {
          count: list.length,
          firstMessage: list[0],
          sampleSenderId: list[0]?.senderId
        });
        
        if (active) setMessages(list);

        // Compute latest createdAt and notify parent to bump sidebar
        if (list.length > 0) {
          const last = list[list.length - 1];
          const latestAt = last?.createdAt || last?.updatedAt || null;
          if (latestAt) onThreadLoaded?.(selectedUser._id, latestAt);
        }
      } catch (e) {
        console.error("Load messages error:", e);
        if (active) setMessages([]);
      } finally {
        if (active) setLoadingMsgs(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [selectedUser, onThreadLoaded]);

  // Listen for incoming socket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (message) => {
      console.log("Socket message received:", message);
      // Only add if it's for this conversation
      if (message.senderId?._id === selectedUser?._id || message.senderId === selectedUser?._id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on("message:received", handleMessageReceived);

    return () => {
      socket.off("message:received", handleMessageReceived);
    };
  }, [socket, selectedUser]);

  // Append message after successful send and report activity upward
  const handleSent = (created) => {
    console.log("handleSent received:", created);
    console.log("created.senderId:", created?.senderId);
    
    // Deep clone to prevent any reference issues
    const messageCopy = JSON.parse(JSON.stringify(created));
    console.log("Message after deep clone:", messageCopy);
    
    setMessages((prev) => [...prev, messageCopy]);
    const when = created?.createdAt || created?.updatedAt || new Date().toISOString();
    onMessageSent?.(selectedUser?._id, when);
  };

  if (!selectedUser) return <NoChatSelected />;

  return (
    <section className="flex-1 flex flex-col">
      <ChatHeader selectedUser={selectedUser} />
      {loadingMsgs ? (
        <div className="flex-1 grid place-items-center text-base-content/60">Loading...</div>
      ) : (
        <MessagesList meId={meId} messages={messages} />
      )}
      <MessageInput selectedUser={selectedUser} onSent={handleSent} meId={meId} />
    </section>
  );
};

export default ChatContainer;