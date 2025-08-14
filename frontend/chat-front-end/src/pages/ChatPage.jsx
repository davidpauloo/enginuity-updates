// src/pages/ChatPage.js
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";
import Sidebar from "../components/Sidebar";
import { useChatStore } from "../store/useChatStore";

const ChatPage = () => {
  const { selectedUser } = useChatStore();

 return (
		
		<div className='h-full w-full flex overflow-hidden'>
			<Sidebar />
			{!selectedUser ? <NoChatSelected /> : <ChatContainer />}
		</div>
	);
};

export default ChatPage;