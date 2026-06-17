"use client";

import { useEffect, useState } from "react";
import type { TimeEntryWithProject } from "@/db/schema";
import { formatDuration, toLocalInput } from "@/lib/time";
import ProjectPicker, { type ProjectWithClient } from "./ProjectPicker";

type Props = {
  entry: TimeEntryWithProject | null;
  projects: ProjectWithClient[];
  onProjectCreated: (p: ProjectWithClient) => void;
  onSaved: () => void;
  onClose: () => void;
};

export default function EditEntryDialog({
  entry,
  projects,
  onProjectCreated,
  onSaved,
  onClose,
}: Props) {
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load the entry's values when the dialog opens.
  useEffect(() => {
    if (!entry) return;
    setDescription(entry.description);
    setProjectId(entry.projectId);
    setStart(toLocalInput(entry.startTime as unknown as string));
    setEnd(
      entry.endTime ? toLocalInput(entry.endTime as unknown as string) : "",
    );
    setError(null);
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  if (!entry) return null;

  // Live preview of the recalculated duration.
  const startMs = start ? new Date(start).getTime() : NaN;
  const endMs = end ? new Date(end).getTime() : NaN;
  const validRange = !isNaN(startMs) && !isNaN(endMs) && endMs > startMs;
  const previewSeconds = validRange ? (endMs - startMs) / 1000 : 0;

  const save = async () => {
    setError(null);
    if (!validRange) {
      setError("End time must be after start time.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        projectId,
        // Send as ISO so the server stores absolute instants.
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save.");
      return;
    }
    onSaved();
    onClose();
  };

  const inputClass =
    "w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-blue-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="mb-4 text-base font-semibold text-foreground">
          Edit time entry
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Project</label>
            <div className="rounded-md border border-border px-1 py-1">
              <ProjectPicker
                projects={projects}
                value={projectId}
                onChange={setProjectId}
                onCreated={onProjectCreated}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Start</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">End</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
            <span className="text-muted">Duration</span>
            <span className="font-mono text-foreground">
              {validRange ? formatDuration(previewSeconds) : "—"}
            </span>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted hover:bg-black/5 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !validRange}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
