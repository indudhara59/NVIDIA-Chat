import { auth } from "@/auth";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_MEMORY_LENGTH = 2000;

async function ownerId() { const session = await auth(); return session?.user?.email || null; }

export async function GET() {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDatabase();
    const memory = await db.collection<{ userId: string; content: string }>("memories").findOne({ userId: owner });
    return Response.json({ content: memory?.content || "" });
  } catch (error) {
    console.error("Memory read failed", error instanceof Error ? error.message : "Unknown database error");
    return Response.json({ error: "Memory is temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { content?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (typeof body.content !== "string" || body.content.length > MAX_MEMORY_LENGTH) return Response.json({ error: "Memory is invalid." }, { status: 400 });
  try {
    const db = await getDatabase();
    await db.collection("memories").updateOne({ userId: owner }, { $set: { content: body.content, updatedAt: Date.now() } }, { upsert: true });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Memory save failed", error instanceof Error ? error.message : "Unknown database error");
    return Response.json({ error: "Memory could not be saved." }, { status: 503 });
  }
}
