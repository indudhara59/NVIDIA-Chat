import { createHash, randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { auth } from "@/auth";
import { getDatabase } from "@/lib/mongodb";
import type { ChatAttachment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_TEXT_LENGTH = 20_000;
const ALLOWED_TYPES = new Set(["application/pdf", "text/plain", "text/markdown", "text/csv", "application/json", "image/png", "image/jpeg", "image/webp"]);
const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);
type StoredAttachment = ChatAttachment & { userId: string; pathname: string };

async function ownerId() {
  const session = await auth();
  return session?.user?.email || null;
}

export async function POST(request: Request) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid upload." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "A file is required." }, { status: 400 });
  if (!file.size || file.size > MAX_FILE_SIZE) return Response.json({ error: "Files must be smaller than 4 MB." }, { status: 413 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "This file type is not supported." }, { status: 415 });
  const id = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "attachment";
  const ownerHash = createHash("sha256").update(owner).digest("hex").slice(0, 20);
  const pathname = `users/${ownerHash}/${id}-${safeName}`;
  try {
    const bytes = await file.arrayBuffer();
    await put(pathname, bytes, { access: "private", addRandomSuffix: false, contentType: file.type });
    const attachment: StoredAttachment = { id, name: file.name.slice(0, 120), contentType: file.type, size: file.size, createdAt: Date.now(), userId: owner, pathname };
    if (TEXT_TYPES.has(file.type)) attachment.textContent = new TextDecoder().decode(bytes).slice(0, MAX_TEXT_LENGTH);
    if (file.type === "application/pdf") {
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(bytes) });
        const result = await parser.getText();
        attachment.textContent = result.text.slice(0, MAX_TEXT_LENGTH);
        await parser.destroy();
      } catch {
        // The file remains available even when a scanned or malformed PDF has no extractable text.
      }
    }
    const db = await getDatabase();
    await db.collection<StoredAttachment>("attachments").insertOne(attachment);
    const clientAttachment: ChatAttachment = { id: attachment.id, name: attachment.name, contentType: attachment.contentType, size: attachment.size, createdAt: attachment.createdAt, textContent: attachment.textContent };
    return Response.json({ attachment: clientAttachment }, { status: 201 });
  } catch (error) {
    console.error("Attachment upload failed", error instanceof Error ? error.message : "Unknown storage error");
    await del(pathname).catch(() => undefined);
    return Response.json({ error: "The file could not be uploaded." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Attachment ID is required." }, { status: 400 });
  try {
    const db = await getDatabase();
    const attachment = await db.collection<StoredAttachment>("attachments").findOne({ id, userId: owner });
    if (!attachment) return Response.json({ error: "Attachment not found." }, { status: 404 });
    const result = await get(attachment.pathname, { access: "private" });
    if (!result || result.statusCode !== 200) return Response.json({ error: "Attachment not found." }, { status: 404 });
    return new Response(result.stream, { headers: { "Content-Type": attachment.contentType, "Content-Length": String(attachment.size), "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Attachment download failed", error instanceof Error ? error.message : "Unknown storage error");
    return Response.json({ error: "The file could not be downloaded." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Attachment ID is required." }, { status: 400 });
  try {
    const db = await getDatabase();
    const attachment = await db.collection<StoredAttachment>("attachments").findOne({ id, userId: owner });
    if (!attachment) return Response.json({ ok: true });
    await del(attachment.pathname);
    await db.collection<StoredAttachment>("attachments").deleteOne({ id, userId: owner });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Attachment delete failed", error instanceof Error ? error.message : "Unknown storage error");
    return Response.json({ error: "The file could not be deleted." }, { status: 503 });
  }
}
