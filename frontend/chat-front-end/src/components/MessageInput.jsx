import { useState } from "react";
import { Send } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const MessageInput = ({ selectedUser, onSent }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  
  // Get current user for senderId
  const authUser = useAuthStore((s) => s.authUser);

  const sendMessage = async () => {
    const body = (text || "").trim();
    if (!body || !selectedUser?._id) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${selectedUser._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: body }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`Send failed ${res.status}: ${res.statusText} ${errText}`);
        return;
      }

      const created = await res.json();

      // ✅ The backend already populates senderId/receiverId, just use it as-is
      onSent?.(created);
      setText("");
    } catch (e) {
      console.error("sendMessage error:", e);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await sendMessage();
  };

  return (
    <form onSubmit={onSubmit} className="p-3 border-t border-base-300 flex gap-2">
      <input
        className="input input-bordered flex-1"
        placeholder={`Message ${selectedUser?.fullName || "user"}...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={sending || !text.trim() || !selectedUser?._id}
      >
        <Send className="size-4" />
      </button>
    </form>
  );
};

export default MessageInput;