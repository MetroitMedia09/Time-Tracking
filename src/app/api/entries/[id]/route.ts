import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

// PATCH /api/entries/:id -> stop the timer (set endTime) or update fields
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updates: Partial<typeof timeEntries.$inferInsert> = {};
  if (body.stop === true) updates.endTime = new Date();
  if (typeof body.description === "string") updates.description = body.description;
  // projectId may be a string (assign) or null (clear).
  if ("projectId" in body) updates.projectId = body.projectId || null;

  // Manual edits to the entry's time. Values are ISO strings.
  if (typeof body.startTime === "string") {
    const d = new Date(body.startTime);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
    }
    updates.startTime = d;
  }
  if (typeof body.endTime === "string") {
    const d = new Date(body.endTime);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid endTime" }, { status: 400 });
    }
    updates.endTime = d;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Scope to the current user's entry only.
  const ownership = and(eq(timeEntries.id, id), eq(timeEntries.userId, userId));

  // Guard: end must be after start. Check against existing values for any
  // field not being changed in this request.
  if (updates.startTime || updates.endTime) {
    const existing = await db
      .select()
      .from(timeEntries)
      .where(ownership)
      .limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const start = updates.startTime ?? existing[0].startTime;
    const end = updates.endTime ?? existing[0].endTime;
    if (end && start && new Date(end) <= new Date(start)) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 },
      );
    }
  }

  const [entry] = await db
    .update(timeEntries)
    .set(updates)
    .where(ownership)
    .returning();

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}

// DELETE /api/entries/:id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { id } = await params;
  await db
    .delete(timeEntries)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)));
  return NextResponse.json({ ok: true });
}
