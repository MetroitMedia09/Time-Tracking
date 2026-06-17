import { NextResponse } from "next/server";
import { db } from "@/db";
import { sharedReports } from "@/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/shares/:id -> revoke a shared link
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.delete(sharedReports).where(eq(sharedReports.id, id));
  return NextResponse.json({ ok: true });
}
