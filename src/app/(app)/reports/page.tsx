"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportData } from "@/lib/report";
import type { Client, Project, SharedReport } from "@/db/schema";
import ReportView from "@/components/ReportView";
import ConfirmDialog from "@/components/ConfirmDialog";

type ProjectWithClient = Project & { client: Client | null };

// Default range: last 7 days (inclusive of today).
function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { start: fmt(start), end: fmt(end) };
}

export default function ReportsPage() {
  const range = defaultRange();
  const [startDate, setStartDate] = useState(range.start);
  const [endDate, setEndDate] = useState(range.end);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [data, setData] = useState<ReportData | null>(null);
  const [shares, setShares] = useState<SharedReport[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
    loadShares();
  }, []);

  const loadReport = useCallback(async () => {
    const qs = new URLSearchParams();
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (projectId) qs.set("projectId", projectId);
    const res = await fetch(`/api/reports?${qs.toString()}`);
    setData(await res.json());
  }, [startDate, endDate, projectId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const loadShares = async () => {
    const res = await fetch("/api/shares");
    setShares(await res.json());
  };

  const createShare = async () => {
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Time Report",
        startDate: startDate || null,
        endDate: endDate || null,
        projectId: projectId || null,
      }),
    });
    if (res.ok) await loadShares();
  };

  const revoke = async () => {
    if (!pendingRevoke) return;
    await fetch(`/api/shares/${pendingRevoke}`, { method: "DELETE" });
    setPendingRevoke(null);
    await loadShares();
  };

  const copy = async (token: string) => {
    const url = `${origin}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  };

  const inputClass =
    "rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-blue-400";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">📊 Reports</h1>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          From
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          To
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Project
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={inputClass}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.client ? ` · ${p.client.name}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={createShare}
          className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          🔗 Share this report
        </button>
      </div>

      {/* Shared links */}
      {shares.length > 0 && (
        <div className="mb-8 rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Shared links
          </h3>
          <ul className="space-y-2">
            {shares.map((s) => {
              const url = `${origin}/shared/${s.token}`;
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <code className="truncate rounded bg-black/5 px-2 py-1 text-xs text-foreground dark:bg-white/10">
                    {url}
                  </code>
                  <span className="text-xs text-muted">
                    {s.startDate ?? "…"} → {s.endDate ?? "…"}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-border px-2 py-1 text-xs text-blue-500 hover:bg-blue-500/10"
                    >
                      View
                    </a>
                    <button
                      onClick={() => copy(s.token)}
                      className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                    >
                      {copied === s.token ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => setPendingRevoke(s.id)}
                      className="rounded border border-border px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data ? <ReportView data={data} /> : <p className="text-muted">Loading…</p>}

      <ConfirmDialog
        open={pendingRevoke !== null}
        title="Revoke this shared link?"
        message="Anyone with the link will no longer be able to view the report."
        confirmLabel="Revoke"
        onConfirm={revoke}
        onCancel={() => setPendingRevoke(null)}
      />
    </div>
  );
}
