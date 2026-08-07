export const NVIDIA_MODEL_CONFIG = {
  endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
  model: "nvidia/nemotron-3-ultra-550b-a55b",
  temperature: 1,
  topP: 0.95,
  maxTokens: 16_384,
  reasoningBudget: 16_384,
  enableThinking: true,
} as const;
