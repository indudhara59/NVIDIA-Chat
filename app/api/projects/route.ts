import { auth } from "@/auth";
import { getDatabase } from "@/lib/mongodb";
import type { ChatProject } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoredProject = ChatProject & { userId: string };
const MAX_PROJECTS = 50;

async function ownerId() {
  const session = await auth();
  return session?.user?.email || null;
}

function validProject(value: unknown): value is ChatProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Record<string, unknown>;
  return typeof project.id === "string" && project.id.length > 0 && project.id.length <= 100
    && typeof project.name === "string" && project.name.trim().length > 0 && project.name.length <= 60
    && typeof project.instructions === "string" && project.instructions.length <= 2000
    && typeof project.createdAt === "number" && typeof project.updatedAt === "number";
}

export async function GET() {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDatabase();
    const projects = await db.collection<StoredProject>("projects").find({ userId: owner }, { projection: { _id: 0, userId: 0 } }).sort({ updatedAt: -1 }).limit(MAX_PROJECTS).toArray();
    return Response.json({ projects });
  } catch (error) {
    console.error("Project read failed", error instanceof Error ? error.message : "Unknown database error");
    return Response.json({ error: "Projects are temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let project: unknown;
  try { project = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!validProject(project)) return Response.json({ error: "Invalid project." }, { status: 400 });
  try {
    const db = await getDatabase();
    const existing = await db.collection<StoredProject>("projects").countDocuments({ userId: owner }, { limit: MAX_PROJECTS });
    if (existing >= MAX_PROJECTS && !await db.collection<StoredProject>("projects").findOne({ userId: owner, id: project.id })) return Response.json({ error: "Project limit reached." }, { status: 409 });
    await db.collection<StoredProject>("projects").replaceOne({ userId: owner, id: project.id }, { ...project, name: project.name.trim(), userId: owner }, { upsert: true });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Project save failed", error instanceof Error ? error.message : "Unknown database error");
    return Response.json({ error: "Project could not be saved." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const owner = await ownerId();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Project ID is required." }, { status: 400 });
  try {
    const db = await getDatabase();
    await Promise.all([
      db.collection<StoredProject>("projects").deleteOne({ userId: owner, id }),
      db.collection("conversations").updateMany({ userId: owner, projectId: id }, { $set: { projectId: null } }),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Project delete failed", error instanceof Error ? error.message : "Unknown database error");
    return Response.json({ error: "Project could not be deleted." }, { status: 503 });
  }
}
