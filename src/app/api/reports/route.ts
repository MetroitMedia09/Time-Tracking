import { NextResponse } from "next/server";
import { buildReport } from "@/lib/report";
import { requireUser } from "@/lib/auth";

// GET /api/reports?startDate=&endDate=&projectId=  (current user's data)
export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { searchParams } = new URL(req.url);
  const report = await buildReport({
    userId,
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    projectId: searchParams.get("projectId"),
  });
  return NextResponse.json(report);
}
