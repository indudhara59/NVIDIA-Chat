import type { ChatSettings, Conversation } from "@/lib/types";

const SETTINGS_KEY = "nemotron-chat:settings:v3";
const conversationCacheKey = (userId: string) => `nemotron-chat:conversation-cache:${encodeURIComponent(userId.toLowerCase())}`;

export const DEFAULT_SETTINGS: ChatSettings = {
  showThinking: false,
  temperature: 1,
  maxTokens: 4096,
  reasoningBudget: 2048,
  tone: "professional",
  customInstructions: "",
  theme: "dark",
  mode: "chat",
};

export function createTitle(prompt: string): string {
  const title = prompt.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  return title.length > 42 ? `${title.slice(0, 39).trimEnd()}…` : title || "New chat";
}

export function loadSettings(): ChatSettings {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") as Partial<ChatSettings> | null;
    if (!value) return DEFAULT_SETTINGS;
    const tokenPresets = [2048, 4096, 8192, 16384];
    const tones = ["professional", "teacher", "student", "custom"];
    const themes = ["dark", "light", "system"];
    const modes = ["chat", "create", "analyze"];
    return {
      showThinking: typeof value.showThinking === "boolean" ? value.showThinking : false,
      temperature: typeof value.temperature === "number" && value.temperature >= 0 && value.temperature <= 2 ? value.temperature : 1,
      maxTokens: tokenPresets.includes(value.maxTokens || 0) ? value.maxTokens as ChatSettings["maxTokens"] : 4096,
      reasoningBudget: tokenPresets.includes(value.reasoningBudget || 0) ? value.reasoningBudget as ChatSettings["reasoningBudget"] : 2048,
      tone: tones.includes(value.tone || "") ? value.tone as ChatSettings["tone"] : "professional",
      customInstructions: typeof value.customInstructions === "string" ? value.customInstructions.slice(0, 500) : "",
      theme: themes.includes(value.theme || "") ? value.theme as ChatSettings["theme"] : "dark",
      mode: modes.includes(value.mode || "") ? value.mode as ChatSettings["mode"] : "chat",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ChatSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadConversationCache(userId: string): Conversation[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(conversationCacheKey(userId)) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((chat): chat is Conversation => Boolean(
      chat && typeof chat === "object" && typeof chat.id === "string" && typeof chat.title === "string"
      && Array.isArray(chat.messages) && typeof chat.createdAt === "number" && typeof chat.updatedAt === "number",
    )).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveConversationCache(userId: string, conversations: Conversation[]): void {
  try { localStorage.setItem(conversationCacheKey(userId), JSON.stringify(conversations)); } catch { /* Storage can be unavailable or full. */ }
}

export function clearConversationCache(userId: string): void {
  localStorage.removeItem(conversationCacheKey(userId));
}
