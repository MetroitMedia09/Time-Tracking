"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Tracker", icon: "⏱️" },
  { href: "/reports", label: "Reports", icon: "📊" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch: only show the resolved toggle after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-5 py-5 text-lg font-semibold text-foreground">
        ⏱️ Tracker
      </div>

      <nav className="flex-1 px-2">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          {mounted && theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
        </button>
      </div>
    </aside>
  );
}
