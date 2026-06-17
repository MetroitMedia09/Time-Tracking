import { NextResponse } from "next/server";
import { db } from "@/db";
import { sharedReports } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { generateToken } from "@/lib/token";
import { requireUser } from "@/lib/auth";

// GET /api/shares -> current user's shared links (most recent first)
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const rows = await db
    .select()
    .from(sharedReports)
    .where(eq(sharedReports.userId, userId))
    .orderBy(desc(sharedReports.createdAt));
  return NextResponse.json(rows);
}

// POST /api/shares -> create a shared link capturing a filter snapshot
export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Time Report";
  const startDate = typeof body.startDate === "string" ? body.startDate : null;
  const endDate = typeof body.endDate === "string" ? body.endDate : null;
  const projectId =
    typeof body.projectId === "string" && body.projectId ? body.projectId : null;

  const [share] = await db
    .insert(sharedReports)
    .values({
      userId,
      token: generateToken(),
      name,
      startDate,
      endDate,
      projectId,
    })
    .returning();

  return NextResponse.json(share, { status: 201 });
}
