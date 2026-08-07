export type MessageRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
  error?: string;
  createdAt: number;
};

export type GenerationState = "idle" | "thinking" | "answering";

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export type ChatSettings = {
  showThinking: boolean;
  temperature: number;
  maxTokens: 2048 | 4096 | 8192 | 16384;
  reasoningBudget: 2048 | 4096 | 8192 | 16384;
};

export type ChatHistoryGroup = {
  label: string;
  chats: Conversation[];
};
