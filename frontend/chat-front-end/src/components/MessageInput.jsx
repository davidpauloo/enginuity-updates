import { useState } from "react";
import { Send } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const MessageInput = ({ selectedUser, onSent }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  
  // Use store's sendMessage function
  const sendMessageFromStore = useChatStore((s) => s.sendMessage);

  const sendMessage = async () => {
    const body = (text || "").trim();
    if (!body || !selectedUser?._id) return;
    
    setSending(true);
    try {
      await sendMessageFromStore({ text: body });
      
      // Notify parent component
      onSent?.({
        text: body,
        createdAt: new Date().toISOString(),
      });
      
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