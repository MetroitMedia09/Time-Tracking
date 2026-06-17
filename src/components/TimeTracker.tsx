"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimeEntryWithProject } from "@/db/schema";
import { durationSeconds, formatClock, formatDuration } from "@/lib/time";
import ConfirmDialog from "./ConfirmDialog";
import EditEntryDialog from "./EditEntryDialog";
import ProjectPicker, { type ProjectWithClient } from "./ProjectPicker";

type ApiState = {
  running: TimeEntryWithProject | null;
  entries: TimeEntryWithProject[];
};

export default function TimeTracker() {
  const [running, setRunning] = useState<TimeEntryWithProject | null>(null);
  const [entries, setEntries] = useState<TimeEntryWithProject[]>([]);
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<TimeEntryWithProject | null>(null);
  // Ticks every second to re-render the live elapsed time.
  const [, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const [entriesRes, projectsRes] = await Promise.all([
      fetch("/api/entries"),
      fetch("/api/projects"),
    ]);
    const data: ApiState = await entriesRes.json();
    const projectList: ProjectWithClient[] = await projectsRes.json();
    setRunning(data.running);
    setEntries(data.entries);
    setProjects(projectList);
    if (data.running) {
      setDescription(data.running.description);
      setProjectId(data.running.projectId);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Drive the live clock only while a timer is running.
  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => setNow(Date.now()), 1000);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }
  }, [running]);

  const start = async () => {
    setBusy(true);
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, projectId }),
    });
    await load();
    setBusy(false);
  };

  const stop = async () => {
    if (!running) return;
    setBusy(true);
    await fetch(`/api/entries/${running.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stop: true, description, projectId }),
    });
    setDescription("");
    setProjectId(null);
    await load();
    setBusy(false);
  };

  // Resume: start a new timer with the same description + project.
  // Stops any currently running timer first (replaceRunning).
  const resume = async (e: TimeEntryWithProject) => {
    setBusy(true);
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: e.description,
        projectId: e.projectId,
        replaceRunning: true,
      }),
    });
    setDescription(e.description);
    setProjectId(e.projectId);
    await load();
    setBusy(false);
  };

  // Assign/clear a project on an already-finished entry.
  const setEntryProject = async (id: string, pid: string | null) => {
    await fetch(`/api/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: pid }),
    });
    await load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await fetch(`/api/entries/${pendingDelete}`, { method: "DELETE" });
    setPendingDelete(null);
    await load();
  };

  const elapsed = running
    ? formatDuration(durationSeconds(running.startTime as unknown as string, null))
    : "00:00:00";

  // Group finished entries by calendar day.
  const finished = entries.filter((e) => e.endTime);
  const byDay = new Map<string, TimeEntryWithProject[]>();
  for (const e of finished) {
    const day = new Date(e.startTime as unknown as string).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(e);
  }

  // Within a day, collapse entries that share the same description + project
  // into one row with a count badge (like Clockify). `items` keeps the
  // underlying entries (already sorted newest-first); `rep` is the newest one.
  type EntryGroup = {
    key: string;
    rep: TimeEntryWithProject;
    items: TimeEntryWithProject[];
    seconds: number;
  };
  const groupDay = (dayEntries: TimeEntryWithProject[]): EntryGroup[] => {
    const map = new Map<string, EntryGroup>();
    for (const e of dayEntries) {
      const key = `${e.description}|${e.projectId ?? ""}`;
      const secs = durationSeconds(
        e.startTime as unknown as string,
        e.endTime as unknown as string,
      );
      const g = map.get(key);
      if (g) {
        g.items.push(e);
        g.seconds += secs;
      } else {
        map.set(key, { key, rep: e, items: [e], seconds: secs });
      }
    }
    return [...map.values()];
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        ⏱️ Time Tracker
      </h1>

      {/* Timer bar */}
      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm">
        <input
          type="text"
          placeholder="What are you working on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-blue-400"
          disabled={busy}
        />
        <ProjectPicker
          projects={projects}
          value={projectId}
          onChange={setProjectId}
          onCreated={(p) => setProjects((prev) => [...prev, p])}
        />
        <span className="font-mono text-lg tabular-nums text-foreground">
          {elapsed}
        </span>
        {running ? (
          <button
            onClick={stop}
            disabled={busy}
            className="rounded-md bg-red-500 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            disabled={busy}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Start
          </button>
        )}
      </div>

      {/* Entries */}
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : finished.length === 0 ? (
        <p className="text-sm text-muted">
          No entries yet. Start the timer above.
        </p>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, dayEntries]) => {
            const total = dayEntries.reduce(
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
                  <h2 className="text-sm font-semibold text-muted">{day}</h2>
                  <span className="font-mono text-sm text-muted">
                    {formatDuration(total)}
                  </span>
                </div>
                <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                  {groupDay(dayEntries).map((g) => {
                    const e = g.rep;
                    const count = g.items.length;
                    return (
                      <li
                        key={g.key}
                        className="group flex items-center gap-3 px-4 py-3 text-sm"
                      >
                        {/* Count badge (like Clockify) when entries are grouped */}
                        {count > 1 ? (
                          <span
                            className="flex h-5 min-w-5 items-center justify-center rounded bg-blue-600 px-1 text-xs font-medium text-white"
                            title={`${count} entries`}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="w-5" />
                        )}
                        <span className="flex-1 text-foreground">
                          {e.description || (
                            <span className="text-muted">No description</span>
                          )}
                        </span>
                        <ProjectPicker
                          projects={projects}
                          value={e.projectId}
                          onChange={(pid) => setEntryProject(e.id, pid)}
                          onCreated={(p) =>
                            setProjects((prev) => [...prev, p])
                          }
                        />
                        <span className="text-muted">
                          {formatClock(e.startTime as unknown as string)} –{" "}
                          {formatClock(e.endTime as unknown as string)}
                        </span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatDuration(g.seconds)}
                        </span>
                        {/* Resume: start a new timer with this description/project */}
                        <button
                          onClick={() => resume(e)}
                          disabled={busy}
                          className="text-muted transition hover:text-green-500 disabled:opacity-40"
                          aria-label="Resume entry"
                          title="Resume"
                        >
                          ▶
                        </button>
                        <button
                          onClick={() => setEditing(e)}
                          className="text-muted opacity-0 transition group-hover:opacity-100 hover:text-blue-500"
                          aria-label="Edit entry"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setPendingDelete(e.id)}
                          className="text-muted opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                          aria-label="Delete entry"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this time entry?"
        message="This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <EditEntryDialog
        entry={editing}
        projects={projects}
        onProjectCreated={(p) => setProjects((prev) => [...prev, p])}
        onSaved={load}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
