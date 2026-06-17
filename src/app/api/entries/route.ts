import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

// Join shape: entry -> project -> client
const withProject = {
  with: { project: { with: { client: true } } },
} as const;

// GET /api/entries -> { running, entries } (current user's only)
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const running = await db.query.timeEntries.findFirst({
    where: and(eq(timeEntries.userId, userId), isNull(timeEntries.endTime)),
    orderBy: desc(timeEntries.startTime),
    ...withProject,
  });

  const entries = await db.query.timeEntries.findMany({
    where: eq(timeEntries.userId, userId),
    orderBy: desc(timeEntries.startTime),
    limit: 50,
    ...withProject,
  });

  return NextResponse.json({ running: running ?? null, entries });
}

// POST /api/entries -> start a new timer (rejects if one is already running)
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => ({}));
  const description = typeof body.description === "string" ? body.description : "";
  const projectId =
    typeof body.projectId === "string" && body.projectId ? body.projectId : null;

  const alreadyRunning = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endTime)))
    .limit(1);

  if (alreadyRunning.length > 0) {
    return NextResponse.json(
      { error: "A timer is already running" },
      { status: 409 },
    );
  }

  const [entry] = await db
    .insert(timeEntries)
    .values({ userId, description, projectId, startTime: new Date() })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
