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
    await Promise.all([db.collection("conversations").deleteMany({ userId: owner }), db.collection("projects").deleteMany({ userId: owner })]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Account data deletion failed", error instanceof Error ? error.message : "Unknown database error");
    return Response.json({ error: "Account data could not be deleted." }, { status: 503 });
  }
}
