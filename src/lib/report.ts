import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import type { TimeEntryWithProject } from "@/db/schema";
import { durationSeconds } from "@/lib/time";

export type ReportFilter = {
  startDate?: string | null; // "YYYY-MM-DD" inclusive
  endDate?: string | null; // "YYYY-MM-DD" inclusive
  projectId?: string | null;
};

export type ProjectTotal = {
  projectId: string | null;
  name: string;
  color: string;
  clientName: string | null;
  seconds: number;
};

export type DayTotal = { date: string; seconds: number };

export type ReportData = {
  totalSeconds: number;
  byProject: ProjectTotal[];
  byDay: DayTotal[];
  entries: TimeEntryWithProject[];
};

// Build the report for a given filter. Only finished entries are counted.
export async function buildReport(filter: ReportFilter): Promise<ReportData> {
  const conditions = [isNotNull(timeEntries.endTime)];

  if (filter.startDate) {
    conditions.push(gte(timeEntries.startTime, new Date(filter.startDate + "T00:00:00")));
  }
  if (filter.endDate) {
    // End of the given day (inclusive).
    conditions.push(lte(timeEntries.startTime, new Date(filter.endDate + "T23:59:59.999")));
  }
  if (filter.projectId) {
    conditions.push(eq(timeEntries.projectId, filter.projectId));
  }

  const entries = await db.query.timeEntries.findMany({
    where: and(...conditions),
    orderBy: desc(timeEntries.startTime),
    with: { project: { with: { client: true } } },
  });

  let totalSeconds = 0;
  const projectMap = new Map<string, ProjectTotal>();
  const dayMap = new Map<string, number>();

  for (const e of entries) {
    const secs = durationSeconds(
      e.startTime as unknown as string,
      e.endTime as unknown as string,
    );
    totalSeconds += secs;

    // By project (null project grouped under a "No project" bucket).
    const key = e.projectId ?? "__none__";
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        projectId: e.projectId,
        name: e.project?.name ?? "No project",
        color: e.project?.color ?? "#94a3b8",
        clientName: e.project?.client?.name ?? null,
        seconds: 0,
      });
    }
    projectMap.get(key)!.seconds += secs;

    // By day (YYYY-MM-DD from the entry's start, local time).
    const d = new Date(e.startTime as unknown as string);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + secs);
  }

  const byProject = [...projectMap.values()].sort((a, b) => b.seconds - a.seconds);
  const byDay = [...dayMap.entries()]
    .map(([date, seconds]) => ({ date, seconds }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalSeconds, byProject, byDay, entries };
}
