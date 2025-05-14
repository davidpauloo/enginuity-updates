import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";
import Sidebar from "../components/Sidebar";
import { useChatStore } from "../store/useChatStore";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen flex flex-col bg-base-200 overflow-hidden">
      {/* Page Heading */}
      <div className="px-4 py-5 border-b border-base-300">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-base-content mb-1">Chats</h1>
          <p className="text-sm font-light text-base-content leading-snug">
            The Chats page lets you send and receive messages in real time. Select a user from the sidebar to start a conversation.
          </p>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 flex justify-center overflow-hidden">
        <div className="bg-base-100 rounded-lg shadow-lg w-full max-w-6xl h-full">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

