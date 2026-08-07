export type MessageRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
  createdAt: number;
};

export type GenerationState = "idle" | "thinking" | "answering";

export type ChatHistoryGroup = {
  label: string;
  chats: { id: string; title: string }[];
};
