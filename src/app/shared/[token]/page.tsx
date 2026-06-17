import { notFound } from "next/navigation";
import { db } from "@/db";
import { sharedReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildReport } from "@/lib/report";
import ReportView from "@/components/ReportView";

// Always render fresh data (snapshot filter, live numbers).
export const dynamic = "force-dynamic";

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const share = await db.query.sharedReports.findFirst({
    where: eq(sharedReports.token, token),
  });

  if (!share) notFound();

  const data = await buildReport({
    startDate: share.startDate,
    endDate: share.endDate,
    projectId: share.projectId,
  });

  return (
    // Public report uses a fixed dark theme (no toggle, no next-themes —
    // keeps this page free of client theme hydration concerns).
    <div className="dark min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-foreground">
              {share.name}
            </div>
            <div className="text-xs text-muted">
              {share.startDate ?? "All time"}
              {share.endDate ? ` → ${share.endDate}` : ""} · Shared report
            </div>
          </div>
          <span className="text-xs text-muted">⏱️ Time Tracker</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <ReportView data={data} />
      </main>
    </div>
  );
}
