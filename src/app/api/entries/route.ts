import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { desc, isNull } from "drizzle-orm";

// Join shape: entry -> project -> client
const withProject = {
  with: { project: { with: { client: true } } },
} as const;

// GET /api/entries -> { running, entries }
export async function GET() {
  const running = await db.query.timeEntries.findFirst({
    where: isNull(timeEntries.endTime),
    orderBy: desc(timeEntries.startTime),
    ...withProject,
  });

  const entries = await db.query.timeEntries.findMany({
    orderBy: desc(timeEntries.startTime),
    limit: 50,
    ...withProject,
  });

  return NextResponse.json({ running: running ?? null, entries });
}

// POST /api/entries -> start a new timer (rejects if one is already running)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const description = typeof body.description === "string" ? body.description : "";
  const projectId =
    typeof body.projectId === "string" && body.projectId ? body.projectId : null;

  const alreadyRunning = await db
    .select()
    .from(timeEntries)
    .where(isNull(timeEntries.endTime))
    .limit(1);

  if (alreadyRunning.length > 0) {
    return NextResponse.json(
      { error: "A timer is already running" },
      { status: 409 },
    );
  }

  const [entry] = await db
    .insert(timeEntries)
    .values({ description, projectId, startTime: new Date() })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
