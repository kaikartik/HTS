"use client";

// In-app notifications for agents (FR-27): new assignments, requester replies, SLA warnings.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AGENT_BASE,
  api,
  formatDate,
  isTrue,
  type NotificationsResponse,
} from "../lib/api";

export default function NotificationBell() {
  const router = useRouter();
  const [data, setData] = useState<NotificationsResponse>({ unread_count: 0, items: [] });
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<NotificationsResponse>("/notifications"));
    } catch {
      /* the bell is optional - ignore network errors */
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const poll = setInterval(() => void load(), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
    };
  }, [load]);

  // close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function openItem(id: number, ticketId: number | null) {
    setOpen(false);
    try {
      await api("/notifications/read", { method: "POST", body: { id } });
    } catch {
      /* ignore */
    }
    void load();
    if (ticketId) router.push(`${AGENT_BASE}/tickets/${ticketId}`);
  }

  async function markAll() {
    try {
      await api("/notifications/read", { method: "POST", body: {} });
    } catch {
      /* ignore */
    }
    void load();
  }

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications, ${data.unread_count} unread`}
        aria-expanded={open}
        className="relative rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
      >
        🔔
        {data.unread_count > 0 && (
          <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs font-bold text-white">
            {data.unread_count > 99 ? "99+" : data.unread_count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {data.unread_count > 0 && (
              <button onClick={markAll} className="text-xs font-semibold text-blue-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {data.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {data.items.map((n) => (
                <li key={n.notification_id}>
                  <button
                    onClick={() => openItem(n.notification_id, n.ticket_id)}
                    className={`block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                      isTrue(n.is_read) ? "text-slate-500" : "bg-blue-50 text-slate-800"
                    }`}
                  >
                    <p>{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
