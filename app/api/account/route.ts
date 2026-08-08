import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await auth();
  const owner = session?.user?.email;
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDatabase();
    const attachments = await db.collection<{ userId: string; pathname: string }>("attachments").find({ userId: owner }).project({ pathname: 1 }).toArray();
    if (attachments.length) await del(attachments.map((file) => file.pathname));
    await Promise.all([db.collection("conversations").deleteMany({ userId: owner }), db.collection("projects").deleteMany({ userId: owner }), db.collection("attachments").deleteMany({ userId: owner }), db.collection("memories").deleteMany({ userId: owner })]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Account data deletion failed", error instanceof Error ? error.message : "Unknown database error");
    return Response.json({ error: "Account data could not be deleted." }, { status: 503 });
  }
}
