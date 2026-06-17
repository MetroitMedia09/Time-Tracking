"use client";

import { useEffect, useRef, useState } from "react";
import type { Client, Project } from "@/db/schema";

export type ProjectWithClient = Project & { client: Client | null };

const COLORS = [
  "#16a34a",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
];

type Props = {
  projects: ProjectWithClient[];
  value: string | null; // selected project id
  onChange: (projectId: string | null) => void;
  onCreated: (project: ProjectWithClient) => void;
};

export default function ProjectPicker({
  projects,
  value,
  onChange,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const ref = useRef<HTMLDivElement>(null);

  const selected = projects.find((p) => p.id === value) ?? null;

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientName, color }),
    });
    if (res.ok) {
      const project: ProjectWithClient = await res.json();
      onCreated(project);
      onChange(project.id);
      setName("");
      setClientName("");
      setCreating(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
      >
        {selected ? (
          <>
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
            <span style={{ color: selected.color }}>{selected.name}</span>
            {selected.client && (
              <span className="text-muted">· {selected.client.name}</span>
            )}
          </>
        ) : (
          <span className="text-muted">+ Project</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-64 rounded-lg border border-border bg-surface py-1 shadow-lg">
          <ul className="max-h-56 overflow-auto">
            <li>
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-muted hover:bg-black/5 dark:hover:bg-white/5"
              >
                No project
              </button>
            </li>
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-foreground">{p.name}</span>
                  {p.client && (
                    <span className="text-muted">· {p.client.name}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-2">
            {creating ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted outline-none focus:border-blue-400"
                />
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client (optional)"
                  className="w-full rounded border border-border bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted outline-none focus:border-blue-400"
                />
                <div className="flex items-center gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-5 w-5 rounded-full ${
                        color === c ? "ring-2 ring-slate-400 ring-offset-1" : ""
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setCreating(false)}
                    className="rounded px-2 py-1 text-xs text-muted hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={create}
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full rounded px-2 py-1.5 text-left text-sm text-blue-500 hover:bg-blue-500/10"
              >
                + Create new project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
