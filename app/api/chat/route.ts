import { NVIDIA_MODEL_CONFIG } from "@/lib/model-config";
import type { ChatStreamEvent, ModelMessage } from "@/lib/chat-protocol";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 40_000;
const MAX_TOTAL_LENGTH = 150_000;
const MAX_BODY_BYTES = 200_000;
const TOKEN_PRESETS = new Set([2048, 4096, 8192, 16384]);

type ResponseTone = "professional" | "teacher" | "student" | "custom";
type SafeConfig = { temperature: number; maxTokens: number; reasoningBudget: number; enableThinking: boolean; tone: ResponseTone; customInstructions: string; projectInstructions: string; personalMemory: string; mode: "chat" | "create" | "analyze" };

const TONE_PROMPTS: Record<Exclude<ResponseTone, "custom">, string> = {
  professional: "Respond in a polished, precise, professional tone. Be clear and well structured.",
  teacher: "Respond like an expert teacher. Explain concepts step by step, use helpful examples, and check assumptions.",
  student: "Respond in a student-friendly style. Use simple language, define unfamiliar terms, and make the answer easy to learn from.",
};

function validateConfig(value: unknown): SafeConfig | null {
  if (!value || typeof value !== "object") return null;
  const { temperature, maxTokens, reasoningBudget, enableThinking, tone, customInstructions, projectInstructions, personalMemory, mode } = value as Record<string, unknown>;
  if (typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) return null;
  if (typeof maxTokens !== "number" || !TOKEN_PRESETS.has(maxTokens)) return null;
  if (typeof reasoningBudget !== "number" || !TOKEN_PRESETS.has(reasoningBudget)) return null;
  if (typeof enableThinking !== "boolean") return null;
  if (tone !== "professional" && tone !== "teacher" && tone !== "student" && tone !== "custom") return null;
  if (typeof customInstructions !== "string" || customInstructions.length > 500) return null;
  if (typeof projectInstructions !== "string" || projectInstructions.length > 2000) return null;
  if (typeof personalMemory !== "string" || personalMemory.length > 2000) return null;
  if (mode !== "chat" && mode !== "create" && mode !== "analyze") return null;
  return { temperature, maxTokens, reasoningBudget, enableThinking, tone, customInstructions, projectInstructions, personalMemory, mode };
}

function validateMessages(value: unknown): ModelMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;
  let totalLength = 0;
  const messages: ModelMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed || content.length > MAX_MESSAGE_LENGTH) return null;
    totalLength += content.length;
    if (totalLength > MAX_TOTAL_LENGTH) return null;
    messages.push({ role, content });
  }
  if (messages.at(-1)?.role !== "user") return null;
  return messages;
}

function upstreamError(status: number): { status: number; message: string } {
  if (status === 401 || status === 403) return { status: 502, message: "Authentication with the model provider failed." };
  if (status === 429) return { status: 429, message: "The model is receiving too many requests. Try again shortly." };
  if (status >= 500) return { status: 502, message: "The model service is temporarily unavailable." };
  return { status: 502, message: "Unable to connect to the model." };
}

function encode(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return Response.json({ error: "Request payload is too large." }, { status: 413 });
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) return Response.json({ error: "Request payload is too large." }, { status: 413 });
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const messages = validateMessages((body as { messages?: unknown } | null)?.messages);
  if (!messages) {
    return Response.json({ error: "Messages must be a non-empty, valid conversation within size limits." }, { status: 400 });
  }
  const config = validateConfig((body as { config?: unknown } | null)?.config);
  if (!config) return Response.json({ error: "Model configuration is invalid." }, { status: 400 });

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "The model service is not configured." }, { status: 503 });
  }

  let upstream: Response;
  try {
    const styleInstruction = config.tone === "custom"
      ? config.customInstructions.trim() || TONE_PROMPTS.professional
      : TONE_PROMPTS[config.tone];
    const modeInstruction = config.mode === "create" ? "Creation mode: produce a concrete, polished deliverable. Prefer complete artifacts, drafts, or code over abstract advice." : config.mode === "analyze" ? "Analysis mode: examine the request systematically, surface assumptions and tradeoffs, and finish with a clear conclusion." : "Conversation mode: answer naturally and directly.";
    const context = [config.personalMemory.trim() ? `User-provided memory:\n${config.personalMemory.trim()}` : "", config.projectInstructions.trim() ? `Project context and instructions:\n${config.projectInstructions.trim()}` : ""].filter(Boolean).join("\n\n");
    const systemInstruction = `${styleInstruction}\n\n${modeInstruction}${context ? `\n\n${context}` : ""}`;
    upstream = await fetch(NVIDIA_MODEL_CONFIG.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL_CONFIG.model,
        messages: [{ role: "system", content: systemInstruction }, ...messages],
        temperature: config.temperature,
        top_p: NVIDIA_MODEL_CONFIG.topP,
        max_tokens: config.maxTokens,
        stream: true,
        chat_template_kwargs: { enable_thinking: config.enableThinking },
        ...(config.enableThinking ? { reasoning_budget: config.reasoningBudget } : {}),
      }),
      signal: request.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("NVIDIA request failed", error instanceof Error ? error.message : "Unknown network error");
    return Response.json({ error: "Connection lost while generating the response." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const friendly = upstreamError(upstream.status);
    return Response.json({ error: friendly.message }, { status: friendly.status });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let malformedChunks = 0;

      const handleEvent = (rawEvent: string) => {
        const data = rawEvent
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n")
          .trim();
        if (!data) return false;
        if (data === "[DONE]") {
          controller.enqueue(encode({ type: "done" }));
          return true;
        }
        try {
          const chunk = JSON.parse(data) as {
            choices?: Array<{ delta?: { reasoning_content?: unknown; content?: unknown } }>;
          };
          const delta = chunk.choices?.[0]?.delta;
          if (typeof delta?.reasoning_content === "string" && delta.reasoning_content) {
            controller.enqueue(encode({ type: "reasoning", text: delta.reasoning_content }));
          }
          if (typeof delta?.content === "string" && delta.content) {
            controller.enqueue(encode({ type: "content", text: delta.content }));
          }
        } catch {
          malformedChunks += 1;
          if (malformedChunks > 3) throw new Error("Malformed model stream");
        }
        return false;
      };

      try {
        let doneReceived = false;
        while (!doneReceived) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = /\r?\n\r?\n/.exec(buffer);
          while (boundary) {
            const event = buffer.slice(0, boundary.index);
            buffer = buffer.slice(boundary.index + boundary[0].length);
            doneReceived = handleEvent(event);
            if (doneReceived) break;
            boundary = /\r?\n\r?\n/.exec(buffer);
          }
        }
        if (!doneReceived && !request.signal.aborted) controller.enqueue(encode({ type: "done" }));
        controller.close();
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("NVIDIA stream failed", error instanceof Error ? error.message : "Unknown stream error");
          controller.enqueue(encode({ type: "error", message: "Connection lost while generating the response." }));
          controller.close();
        }
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      void upstream.body?.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
