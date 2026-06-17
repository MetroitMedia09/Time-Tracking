// Format a duration in seconds as HH:MM:SS
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Seconds between two ISO timestamps (or now, if end is null)
export function durationSeconds(start: string, end: string | null): number {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  return (endMs - startMs) / 1000;
}

// Format a timestamp as a 12-hour clock in the viewer's LOCAL time
// (e.g. "06:25 PM"). Client-only usage to avoid SSR/CSR mismatches.
export function formatClock(iso: string): string {
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)} ${ampm}`;
}

// Convert an ISO/Date to the value strings an <input type="datetime-local">
// expects ("YYYY-MM-DDTHH:mm"), in local time.
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
