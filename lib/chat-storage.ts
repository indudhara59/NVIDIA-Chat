import type { ChatSettings, Conversation } from "@/lib/types";

const CHATS_KEY = "nemotron-chat:conversations:v1";
const SETTINGS_KEY = "nemotron-chat:settings:v1";

export const DEFAULT_SETTINGS: ChatSettings = {
  showThinking: true,
  temperature: 1,
  maxTokens: 16_384,
  reasoningBudget: 16_384,
};

export function createTitle(prompt: string): string {
  const title = prompt.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  return title.length > 42 ? `${title.slice(0, 39).trimEnd()}…` : title || "New chat";
}

export function loadConversations(): Conversation[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CHATS_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((chat): chat is Conversation => Boolean(chat && typeof chat === "object" && typeof chat.id === "string" && typeof chat.title === "string" && Array.isArray(chat.messages) && typeof chat.createdAt === "number" && typeof chat.updatedAt === "number"))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(CHATS_KEY, JSON.stringify(conversations));
}

export function loadSettings(): ChatSettings {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") as Partial<ChatSettings> | null;
    if (!value) return DEFAULT_SETTINGS;
    const tokenPresets = [2048, 4096, 8192, 16384];
    return {
      showThinking: typeof value.showThinking === "boolean" ? value.showThinking : true,
      temperature: typeof value.temperature === "number" && value.temperature >= 0 && value.temperature <= 2 ? value.temperature : 1,
      maxTokens: tokenPresets.includes(value.maxTokens || 0) ? value.maxTokens as ChatSettings["maxTokens"] : 16_384,
      reasoningBudget: tokenPresets.includes(value.reasoningBudget || 0) ? value.reasoningBudget as ChatSettings["reasoningBudget"] : 16_384,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ChatSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
