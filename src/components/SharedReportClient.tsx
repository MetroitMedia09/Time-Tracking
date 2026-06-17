"use client";

import { useEffect, useState } from "react";
import type { ReportData } from "@/lib/report";
import ReportView from "./ReportView";

type Props = {
  token: string;
  initialData: ReportData;
  initialStart: string | null;
  initialEnd: string | null;
};

export default function SharedReportClient({
  token,
  initialData,
  initialStart,
  initialEnd,
}: Props) {
  const [start, setStart] = useState(initialStart ?? "");
  const [end, setEnd] = useState(initialEnd ?? "");
  const [data, setData] = useState<ReportData>(initialData);
  const [loading, setLoading] = useState(false);
  // Track whether the viewer has changed anything from the initial snapshot.
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) return;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    // Always send the keys so the server knows the viewer set the range
    // (empty value = no bound).
    qs.set("startDate", start);
    qs.set("endDate", end);
    fetch(`/api/shared/${token}?${qs.toString()}`)
      .then((r) => r.json())
      .then((d: ReportData) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [start, end, token, touched]);

  const inputClass =
    "rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-blue-400";

  return (
    <div className="space-y-6">
      {/* Viewer date controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          From
          <input
            type="date"
            value={start}
            onChange={(e) => {
              setTouched(true);
              setStart(e.target.value);
            }}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          To
          <input
            type="date"
            value={end}
            onChange={(e) => {
              setTouched(true);
              setEnd(e.target.value);
            }}
            className={inputClass}
          />
        </label>
        {(start || end) && (
          <button
            onClick={() => {
              setTouched(true);
              setStart("");
              setEnd("");
            }}
            className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            Clear (all time)
          </button>
        )}
        {loading && <span className="text-sm text-muted">Loading…</span>}
      </div>

      <ReportView data={data} />
    </div>
  );
}
