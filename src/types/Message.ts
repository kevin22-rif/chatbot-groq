export interface Message {
  role: "user" | "model";
  content: string;
}

export interface ChatConfig {
  systemInstruction: string;
  botName: string;
  welcomeMessage: string;
}