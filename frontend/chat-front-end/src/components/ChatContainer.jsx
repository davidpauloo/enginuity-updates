import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Flag to track first load

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (isAtBottom && !isFirstLoad) {
      // Scroll only when new messages arrive and not on initial load
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setIsFirstLoad(false); // Set the flag to false after initial load
    }
  }, [messages, isAtBottom, isFirstLoad]);

  const handleScroll = (event) => {
    const container = event.target;
    const bottom =
      container.scrollHeight === container.scrollTop + container.clientHeight;

    setIsAtBottom(bottom);
  };

  // Prevent body scroll when chat container scrolls
  const preventBodyScroll = (event) => {
    if (event.target.scrollHeight > event.target.clientHeight) {
      document.body.style.overflow = "hidden"; // Disable body scrolling when chat is scrollable
    } else {
      document.body.style.overflow = "auto"; // Enable body scroll when necessary
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 flex flex-col overflow-hidden" // Only chat scrolls, not the page
      onScroll={(event) => {
        handleScroll(event);
        preventBodyScroll(event); // Prevent page scroll
      }}
    >
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
        <div ref={messageEndRef} /> {/* Ensures scrolling to the bottom */}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;