"use client";

import { useEffect, useState } from "react";
import type { ReportData } from "@/lib/report";
import type { TimeEntryWithProject } from "@/db/schema";
import { durationSeconds, formatClock, formatDuration } from "@/lib/time";

function hours(seconds: number) {
  return (seconds / 3600).toFixed(2);
}

// Renders a local-time clock only after mount so the server (which has no
// access to the viewer's timezone) and client markup match during hydration.
function LocalClock({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => setText(formatClock(iso)), [iso]);
  return <>{text || "—"}</>;
}

// A sortable "YYYY-MM-DD" key in the viewer's LOCAL time, so days order
// chronologically regardless of insertion order.
function dayKey(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Renders a day's label only after mount so the SSR markup (timezone-unaware)
// matches the hydrated client markup.
function LocalDayLabel({ iso, fallback }: { iso: string; fallback: string }) {
  const [text, setText] = useState("");
  useEffect(() => setText(dayLabel(iso)), [iso]);
  return <>{text || fallback}</>;
}

export default function ReportView({ data }: { data: ReportData }) {
  const maxDay = Math.max(1, ...data.byDay.map((d) => d.seconds));

  // Group the (already newest-first) entries by calendar day, in the viewer's
  // local time, so the entries section mirrors the main tracker's layout.
  const byDay = new Map<string, TimeEntryWithProject[]>();
  for (const e of data.entries) {
    const key = dayKey(e.startTime as unknown as string);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  // Newest day first.
  const dayGroups = [...byDay.entries()].sort(([a], [b]) =>
    a < b ? 1 : a > b ? -1 : 0,
  );

  return (
    <div className="space-y-8">
      {/* Total */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="text-sm text-muted">Total tracked</div>
        <div className="mt-1 font-mono text-3xl font-semibold text-foreground">
          {formatDuration(data.totalSeconds)}
        </div>
      </div>

      {data.totalSeconds === 0 ? (
        <p className="text-sm text-muted">No time tracked in this range.</p>
      ) : (
        <>
          {/* Daily bar chart */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Daily breakdown
            </h3>
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {data.byDay.map((d) => (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                  title={`${d.date}: ${formatDuration(d.seconds)}`}
                >
                  <span className="text-[10px] text-muted">{hours(d.seconds)}h</span>
                  <div
                    className="w-full rounded-t bg-blue-500"
                    style={{ height: `${(d.seconds / maxDay) * 120}px` }}
                  />
                  <span className="text-[10px] text-muted">
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* By project */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              By project
            </h3>
            <ul className="space-y-3">
              {data.byProject.map((p) => {
                const pct = (p.seconds / data.totalSeconds) * 100;
                return (
                  <li key={p.projectId ?? "none"}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="text-foreground">{p.name}</span>
                        {p.clientName && (
                          <span className="text-muted">· {p.clientName}</span>
                        )}
                      </span>
                      <span className="font-mono text-foreground">
                        {formatDuration(p.seconds)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Entries grouped by day — mirrors the main tracker's layout. */}
          <div className="space-y-6">
            {dayGroups.map(([day, dayEntries]) => {
              const labelIso = dayEntries[0]?.startTime as unknown as string;
              const dayTotal = dayEntries.reduce(
                (sum, e) =>
                  sum +
                  durationSeconds(
                    e.startTime as unknown as string,
                    e.endTime as unknown as string,
                  ),
                0,
              );
              return (
                <div key={day}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted">
                      <LocalDayLabel iso={labelIso} fallback={day} />
                    </h3>
                    <span className="font-mono text-sm text-muted">
                      {formatDuration(dayTotal)}
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                          <th className="px-4 py-3 font-medium">Description</th>
                          <th className="px-4 py-3 font-medium">Project</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium">
                            Time
                          </th>
                          <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dayEntries.map((e) => (
                          <tr key={e.id}>
                            <td className="px-4 py-3 text-foreground">
                              {e.description || (
                                <span className="text-muted">No description</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {e.project ? (
                                <span className="flex items-center gap-2 whitespace-nowrap">
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: e.project.color }}
                                  />
                                  <span style={{ color: e.project.color }}>
                                    {e.project.name}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted">
                              <LocalClock iso={e.startTime as unknown as string} />{" "}
                              – <LocalClock iso={e.endTime as unknown as string} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-foreground">
                              {formatDuration(
                                durationSeconds(
                                  e.startTime as unknown as string,
                                  e.endTime as unknown as string,
                                ),
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
