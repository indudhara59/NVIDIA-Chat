import { NVIDIA_MODEL_CONFIG } from "@/lib/model-config";
import type { ChatStreamEvent, ModelMessage } from "@/lib/chat-protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 40_000;
const MAX_TOTAL_LENGTH = 150_000;

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
  if (status === 401 || status === 403) return { status: 502, message: "The model service could not be authenticated." };
  if (status === 429) return { status: 429, message: "Rate limit reached. Please try again shortly." };
  if (status >= 500) return { status: 502, message: "The model service is temporarily unavailable." };
  return { status: 502, message: "Unable to connect to the model." };
}

function encode(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const messages = validateMessages((body as { messages?: unknown } | null)?.messages);
  if (!messages) {
    return Response.json({ error: "Messages must be a non-empty, valid conversation within size limits." }, { status: 400 });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "The model service is not configured." }, { status: 503 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(NVIDIA_MODEL_CONFIG.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL_CONFIG.model,
        messages,
        temperature: NVIDIA_MODEL_CONFIG.temperature,
        top_p: NVIDIA_MODEL_CONFIG.topP,
        max_tokens: NVIDIA_MODEL_CONFIG.maxTokens,
        stream: true,
        chat_template_kwargs: { enable_thinking: NVIDIA_MODEL_CONFIG.enableThinking },
        reasoning_budget: NVIDIA_MODEL_CONFIG.reasoningBudget,
      }),
      signal: request.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("NVIDIA request failed", error instanceof Error ? error.message : "Unknown network error");
    return Response.json({ error: "Unable to connect to the model." }, { status: 502 });
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
          controller.enqueue(encode({ type: "error", message: "The model response was interrupted." }));
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
