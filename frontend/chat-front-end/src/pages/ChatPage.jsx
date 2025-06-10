// src/pages/ChatPage.js
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";
import Sidebar from "../components/Sidebar";
import { useChatStore } from "../store/useChatStore";

const ChatPage = () => {
  const { selectedUser } = useChatStore();

 return (
		// This is the new layout.
		// - h-full: Makes it take up the full height of its parent (<main>).
		// - flex: Allows the chat sidebar and chat container to sit side-by-side.
		// - overflow-hidden: Prevents any weird overflow issues from its children.
		<div className='h-full w-full flex overflow-hidden'>
			<Sidebar />
			{!selectedUser ? <NoChatSelected /> : <ChatContainer />}
		</div>
	);
};

export default ChatPage;