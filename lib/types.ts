export type MessageRole = "user" | "assistant";

export type ChatAttachment = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  createdAt: number;
  textContent?: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
  error?: string;
  attachments?: ChatAttachment[];
  createdAt: number;
};

export type GenerationState = "idle" | "thinking" | "answering";

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  projectId?: string | null;
  parentConversationId?: string | null;
  branchedFromMessageId?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ChatProject = {
  id: string;
  name: string;
  instructions: string;
  createdAt: number;
  updatedAt: number;
};

export type ChatSettings = {
  showThinking: boolean;
  temperature: number;
  maxTokens: 2048 | 4096 | 8192 | 16384;
  reasoningBudget: 2048 | 4096 | 8192 | 16384;
  tone: "professional" | "teacher" | "student" | "custom";
  customInstructions: string;
  theme: "dark" | "light" | "system";
};

export type ChatHistoryGroup = {
  label: string;
  chats: Conversation[];
};
