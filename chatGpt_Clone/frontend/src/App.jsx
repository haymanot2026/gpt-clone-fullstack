
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatHeader from "./components/ChatHeader/ChatHeader";
import MessageList from "./components/MessageList/MessageList";
import ChatInput from "./components/ChatInput/ChatInput";
import "./App.css";

// Render Backend API URL
const API_BASE_URL = "https://gpt-clone-fullstack.onrender.com/api";

function App() {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversations, isLoading]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/conversations`
      );

      if (response.data.status === "success") {
        setConversations(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const handleSendMessage = async (question) => {
    const tempUserMessage = {
      id: Date.now(),
      role: "user",
      content: question,
    };

    setConversations((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/conversations`,
        { question }
      );

      if (response.data.status === "success") {
        const {
          userConversation,
          assistantConversation,
        } = response.data.data;

        setConversations((prev) => {
          const filtered = prev.filter(
            (msg) => msg.id !== tempUserMessage.id
          );

          return [
            ...filtered,
            userConversation,
            assistantConversation,
          ];
        });
      } else {
        throw new Error(
          response.data.message || "Failed to generate a response."
        );
      }
    } catch (error) {
      console.error("Error posting conversation:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "There was an error generating a response.";

      const errorConversation = {
        id: Date.now() + 1,
        role: "assistant",
        content: errorMessage,
      };

      setConversations((prev) => {
        const filtered = prev.filter(
          (msg) => msg.id !== tempUserMessage.id
        );

        return [...filtered, errorConversation];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="chat">
        <ChatHeader />

        <MessageList
          conversations={conversations}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}

export default App;
