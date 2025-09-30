// src/components/ChatHeader.jsx
import { X, Video } from "lucide-react";

const ChatHeader = ({ selectedUser, onClose }) => {
  const user = selectedUser || {};

  const handleStartVideo = () => {
    if (!user?._id) return;
    const url = `/meet/${user._id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={user?.profilePic || "/avatar.png"} alt={user?.fullName || "User"} />
            </div>
          </div>
          <div>
            <h3 className="font-medium">{user?.fullName || "User"}</h3>
            <p className="text-sm text-base-content/70">Chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartVideo}
            className="p-2 hover:bg-base-200 rounded-md transition"
            aria-label="Start video meeting"
            title="Start video meeting"
          >
            <Video className="size-5" />
          </button>
          <button
            onClick={() => onClose?.()}
            className="p-2 hover:bg-base-200 rounded-md transition"
            aria-label="Close chat"
            title="Close chat"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
