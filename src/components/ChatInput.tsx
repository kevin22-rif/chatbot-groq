import { useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ketik pesan Anda..."
        disabled={isLoading}
      />

      <button type="submit" disabled={isLoading || !input.trim()}>
        Kirim
      </button>
    </form>
  );
}

export default ChatInput;