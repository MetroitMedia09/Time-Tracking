import { NextResponse } from "next/server";
import { db } from "@/db";
import { sharedReports } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

// DELETE /api/shares/:id -> revoke a shared link (current user's only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { id } = await params;
  await db
    .delete(sharedReports)
    .where(and(eq(sharedReports.id, id), eq(sharedReports.userId, userId)));
  return NextResponse.json({ ok: true });
}
