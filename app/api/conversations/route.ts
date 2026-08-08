import { auth } from "@/auth";
import { getDatabase } from "@/lib/mongodb";
import type { ChatMessage, Conversation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHATS = 200;
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 40_000;
const MAX_TITLE_LENGTH = 60;
const MAX_BODY_BYTES = 200_000;

type StoredConversation = Conversation & { userId: string };

function validMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return typeof message.id === "string" && message.id.length <= 100
    && (message.role === "user" || message.role === "assistant")
    && typeof message.content === "string" && message.content.length <= MAX_MESSAGE_LENGTH
    && (message.reasoning === undefined || typeof message.reasoning === "string")
    && (message.error === undefined || typeof message.error === "string")
    && typeof message.createdAt === "number" && Number.isFinite(message.createdAt);
}

function validConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const chat = value as Record<string, unknown>;
  return typeof chat.id === "string" && chat.id.length > 0 && chat.id.length <= 100
    && typeof chat.title === "string" && chat.title.trim().length > 0 && chat.title.length <= MAX_TITLE_LENGTH
    && (chat.projectId === undefined || chat.projectId === null || (typeof chat.projectId === "string" && chat.projectId.length <= 100))
    && (chat.parentConversationId === undefined || chat.parentConversationId === null || (typeof chat.parentConversationId === "string" && chat.parentConversationId.length <= 100))
    && (chat.branchedFromMessageId === undefined || chat.branchedFromMessageId === null || (typeof chat.branchedFromMessageId === "string" && chat.branchedFromMessageId.length <= 100))
    && Array.isArray(chat.messages) && chat.messages.length <= MAX_MESSAGES && chat.messages.every(validMessage)
    && typeof chat.createdAt === "number" && Number.isFinite(chat.createdAt)
    && typeof chat.updatedAt === "number" && Number.isFinite(chat.updatedAt);
}

async function userId() {
  const session = await auth();
  return session?.user?.email || null;
}

function unavailable() {
  return Response.json({ error: "Conversation storage is temporarily unavailable." }, { status: 503 });
}

export async function GET() {
  const owner = await userId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDatabase();
    const chats = await db.collection<StoredConversation>("conversations").find({ userId: owner }, { projection: { userId: 0, _id: 0 } }).sort({ updatedAt: -1 }).limit(MAX_CHATS).toArray();
    return Response.json({ conversations: chats });
  } catch (error) {
    console.error("Conversation read failed", error instanceof Error ? error.message : "Unknown database error");
    return unavailable();
  }
}

export async function PUT(request: Request) {
  const owner = await userId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "Payload too large." }, { status: 413 });
  let conversation: unknown;
  try { conversation = JSON.parse(raw); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!validConversation(conversation)) return Response.json({ error: "Invalid conversation." }, { status: 400 });
  try {
    const db = await getDatabase();
    await db.collection<StoredConversation>("conversations").replaceOne({ id: conversation.id, userId: owner }, { ...conversation, userId: owner }, { upsert: true });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Conversation save failed", error instanceof Error ? error.message : "Unknown database error");
    return unavailable();
  }
}

export async function PATCH(request: Request) {
  const owner = await userId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { id?: unknown; title?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (typeof body.id !== "string" || typeof body.title !== "string" || !body.title.trim() || body.title.length > MAX_TITLE_LENGTH) return Response.json({ error: "Invalid title." }, { status: 400 });
  try {
    const db = await getDatabase();
    await db.collection<StoredConversation>("conversations").updateOne({ id: body.id, userId: owner }, { $set: { title: body.title.trim(), updatedAt: Date.now() } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Conversation rename failed", error instanceof Error ? error.message : "Unknown database error");
    return unavailable();
  }
}

export async function DELETE(request: Request) {
  const owner = await userId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  try {
    const db = await getDatabase();
    if (id) await db.collection<StoredConversation>("conversations").deleteOne({ id, userId: owner });
    else await db.collection<StoredConversation>("conversations").deleteMany({ userId: owner });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Conversation delete failed", error instanceof Error ? error.message : "Unknown database error");
    return unavailable();
  }
}
