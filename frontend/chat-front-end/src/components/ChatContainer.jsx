import { useEffect } from "react";
import NoChatSelected from "./NoChatSelected";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatMessage = ({ meId, msg }) => {
  const sender = msg?.senderId;
  const me = String(meId || "");
  const sid = typeof sender === "object" ? String(sender?._id || "") : String(sender || "");
  const isMine = me && sid && me === sid;

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
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
        {msg?.image && (
          <img src={msg.image} alt="message" className="max-w-full rounded mt-2" />
        )}
      </div>
      <span className="text-xs text-base-content/60 mt-1 px-1">
        {formatTime(msg?.createdAt || msg?.updatedAt)}
      </span>
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
  const currentUser = useAuthStore((s) => s.authUser);
  const meId = currentUser?._id;

  // Use chat store for messages and real-time updates
  const messages = useChatStore((s) => s.messages);
  const isMessagesLoading = useChatStore((s) => s.isMessagesLoading);
  const getMessages = useChatStore((s) => s.getMessages);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);

  // When selectedUser changes, update the store and load messages
  useEffect(() => {
    if (selectedUser) {
      console.log("ChatContainer: Setting selected user:", selectedUser.fullName);
      setSelectedUser(selectedUser);
      
      getMessages(selectedUser._id).then(() => {
        // Notify parent after messages load
        if (messages.length > 0) {
          const last = messages[messages.length - 1];
          const latestAt = last?.createdAt || last?.updatedAt || null;
          if (latestAt) onThreadLoaded?.(selectedUser._id, latestAt);
        }
      });
    }
  }, [selectedUser?._id]);

  // Handle message sent callback
  const handleSent = (created) => {
    console.log("Message sent:", created);
    const when = created?.createdAt || created?.updatedAt || new Date().toISOString();
    onMessageSent?.(selectedUser?._id, when);
  };

  if (!selectedUser) return <NoChatSelected />;

  return (
    <section className="flex-1 flex flex-col">
      <ChatHeader selectedUser={selectedUser} />
      {isMessagesLoading ? (
        <div className="flex-1 grid place-items-center text-base-content/60">Loading...</div>
      ) : (
        <MessagesList meId={meId} messages={messages} />
      )}
      <MessageInput selectedUser={selectedUser} onSent={handleSent} meId={meId} />
    </section>
  );
};

export default ChatContainer;