import { NextResponse } from "next/server";
import { buildReport } from "@/lib/report";

// GET /api/reports?startDate=&endDate=&projectId=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const report = await buildReport({
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    projectId: searchParams.get("projectId"),
  });
  return NextResponse.json(report);
}
