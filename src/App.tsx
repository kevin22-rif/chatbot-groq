import { useState } from "react";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";
import { sendMessage } from "./services/groqService";
import type { Message } from "./types/Message";
import chatbotConfig from "./config/chatbotConfig";
import "./App.css";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (text: string) => {
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const reply = await sendMessage(text, messages);
      const botMessage: Message = { role: "model", content: reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage: Message = {
        role: "model",
        content: "Maaf, terjadi kesalahan. Silakan coba lagi.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => setMessages([]);

  return (
    <div className="app">
      <div className="header">
        <h1>{chatbotConfig.botName}</h1>
        <button className="clear-btn" onClick={handleClear}>
          Chat Baru
        </button>
      </div>

      <ChatWindow messages={messages} isLoading={isLoading} />
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}

export default App;