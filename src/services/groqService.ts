import type { Message } from "../types/Message";
import chatbotConfig from "../config/chatbotConfig";
 
const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
 
export async function sendMessage(
  prompt: string,
  history: Message[]
): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      "API Key tidak ditemukan! Pastikan file .env berisi VITE_GROQ_API_KEY dan restart dev server (npm run dev)."
    );
  }
 
  const messages = [
    { role: "system", content: chatbotConfig.systemInstruction },
    ...history.map((msg) => ({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: prompt },
  ];
 
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  });
 
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || response.statusText;
    console.error(`[Groq API Error] Status: ${response.status}`, errorMsg);
    throw new Error(`Groq API Error (${response.status}): ${errorMsg}`);
  }
 
  const data = await response.json();
  return data.choices[0].message.content;
}
 
