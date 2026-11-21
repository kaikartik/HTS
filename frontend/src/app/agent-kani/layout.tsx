"use client";

// Agent Workspace shell: login guard, sidebar, 30-minute idle logout (NFR-04).
// The login page is rendered without the shell.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import NotificationBell from "./components/NotificationBell";
import {
  AGENT_BASE,
  clearSession,
  useHydrated,
  useSessionUser,
} from "./lib/api";

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const LOGIN_PATH = `${AGENT_BASE}/login`;

const NAV = [
  { href: AGENT_BASE, label: "Overview", icon: "⌂", match: (p: string) => p === AGENT_BASE || p.startsWith(`${AGENT_BASE}/tickets`) },
  { href: `${AGENT_BASE}/kb`, label: "Knowledge Base", icon: "▧", match: (p: string) => p.startsWith(`${AGENT_BASE}/kb`) },
];

export default function AgentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionUser();
  const hydrated = useHydrated();
  const onLoginPage = pathname === LOGIN_PATH;
  const loggedIn = user !== null;

  // Redirect rules (only after hydration, so we never act on the server snapshot)
  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn && !onLoginPage) router.replace(LOGIN_PATH);
    if (loggedIn && onLoginPage) router.replace(AGENT_BASE);
  }, [hydrated, loggedIn, onLoginPage, router]);

  // Auto sign-out after 30 idle minutes
  useEffect(() => {
    if (!loggedIn) return;

    let timer = setTimeout(clearSession, IDLE_LIMIT_MS);
    let lastReset = Date.now();

    const resetTimer = () => {
      const now = Date.now();
      if (now - lastReset < 1000) return;
      lastReset = now;
      clearTimeout(timer);
      timer = setTimeout(clearSession, IDLE_LIMIT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((name) => window.addEventListener(name, resetTimer));

    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, resetTimer));
    };
  }, [loggedIn]);

  if (onLoginPage) return <>{children}</>;

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 md:flex">
      <aside className="w-full bg-slate-950 p-5 text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold">
            H
          </div>
          <div>
            <h2 className="text-xl font-bold">HTS</h2>
            <p className="text-xs text-slate-400">Agent Workspace</p>
          </div>
        </div>

        <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">
          Workspace
        </p>

        <nav className="space-y-2">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-4 py-3 text-sm ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                {item.icon} <span className="ml-2">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 rounded-xl bg-slate-900 p-4">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="mt-1 break-all text-xs text-slate-400">{user.email}</p>
          <button
            onClick={clearSession}
            className="mt-4 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <div className="mb-4 flex justify-end">
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
