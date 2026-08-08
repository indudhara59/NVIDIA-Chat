import type { ChatSettings } from "@/lib/types";

const SETTINGS_KEY = "nemotron-chat:settings:v2";

export const DEFAULT_SETTINGS: ChatSettings = {
  showThinking: false,
  temperature: 1,
  maxTokens: 4096,
  reasoningBudget: 2048,
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
    return {
      showThinking: typeof value.showThinking === "boolean" ? value.showThinking : false,
      temperature: typeof value.temperature === "number" && value.temperature >= 0 && value.temperature <= 2 ? value.temperature : 1,
      maxTokens: tokenPresets.includes(value.maxTokens || 0) ? value.maxTokens as ChatSettings["maxTokens"] : 4096,
      reasoningBudget: tokenPresets.includes(value.reasoningBudget || 0) ? value.reasoningBudget as ChatSettings["reasoningBudget"] : 2048,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ChatSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
