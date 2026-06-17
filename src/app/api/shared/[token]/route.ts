import { NextResponse } from "next/server";
import { db } from "@/db";
import { sharedReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildReport } from "@/lib/report";

// PUBLIC (no auth). GET /api/shared/:token?startDate=&endDate=
// Lets a shared-report viewer change the date range. The project filter
// stays fixed to whatever the share was created with.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const share = await db.query.sharedReports.findFirst({
    where: eq(sharedReports.token, token),
  });
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  // Viewer-supplied dates override the snapshot; null clears the bound.
  const hasStart = searchParams.has("startDate");
  const hasEnd = searchParams.has("endDate");

  const data = await buildReport({
    userId: share.userId,
    startDate: hasStart ? searchParams.get("startDate") || null : share.startDate,
    endDate: hasEnd ? searchParams.get("endDate") || null : share.endDate,
    projectId: share.projectId,
  });

  return NextResponse.json(data);
}
