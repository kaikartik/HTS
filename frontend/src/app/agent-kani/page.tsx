"use client";

// Agent dashboard + ticket queue (FR-15 queue view, FR-25 breach flags, FR-29 search/filter)

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AGENT_BASE,
  api,
  errorMessage,
  formatDate,
  isDone,
  isTrue,
  priorityStyle,
  slaState,
  statusStyle,
  useNow,
  type QueueTicket,
} from "./lib/api";

const STATUSES = ["New", "Open", "In Progress", "On Hold", "Resolved", "Closed", "Reopened"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const PAGE_SIZE = 25; // SRS 4.1: 25 rows default

type Tab = "mine" | "team";

export default function AgentQueuePage() {
  const now = useNow();
  const [mine, setMine] = useState<QueueTicket[]>([]);
  const [team, setTeam] = useState<QueueTicket[]>([]);
  const [tab, setTab] = useState<Tab>("mine");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [mineRows, teamRows] = await Promise.all([
        api<QueueTicket[]>("/tickets?scope=mine"),
        api<QueueTicket[]>("/tickets?scope=team"),
      ]);
      setMine(mineRows);
      setTeam(teamRows);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Could not load tickets."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0); // initial load
    const poll = setInterval(() => void load(), 60_000); // light polling
    return () => {
      clearTimeout(first);
      clearInterval(poll);
    };
  }, [load]);

  async function refresh() {
    setLoading(true);
    await load();
  }

  async function claim(ticketId: number) {
    setClaimingId(ticketId);
    try {
      await api(`/tickets/${ticketId}/claim`, { method: "POST" });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not claim the ticket."));
    } finally {
      setClaimingId(null);
    }
  }

  const rows = tab === "mine" ? mine : team;

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return rows.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (categoryFilter && t.category_name !== categoryFilter) return false;
      const created = new Date(t.created_at).getTime();
      if (dateFrom && created < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
      if (dateTo && created > new Date(`${dateTo}T23:59:59.999`).getTime()) return false;
      if (!query) return true;
      return [t.ticket_no, t.subject, t.requester_name, t.category_name]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [rows, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(rows.map((t) => t.category_name))).sort(),
    [rows]
  );
  const hasFilters = Boolean(search || statusFilter || priorityFilter || categoryFilter || dateFrom || dateTo);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setCategoryFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = [
    { label: "Assigned to me", value: mine.length, detail: "All statuses" },
    {
      label: "New / Open",
      value: mine.filter((t) => ["new", "open", "reopened"].includes(t.status.toLowerCase())).length,
      detail: "Waiting for action",
    },
    {
      label: "In Progress / On Hold",
      value: mine.filter((t) => ["in progress", "on hold"].includes(t.status.toLowerCase())).length,
      detail: "Currently being handled",
    },
    {
      label: "SLA at risk",
      value: mine.filter((t) => !isDone(t.status) && (isTrue(t.is_breached) || isTrue(t.warned_75))).length,
      detail: "Breached or 75% warning",
    },
  ];

  const tabButton = (value: Tab, label: string, count: number) => (
    <button
      onClick={() => {
        setTab(value);
        setPage(1);
      }}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        tab === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label} <span className="ml-1 opacity-80">({count})</span>
    </button>
  );

  return (
    <>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Helpdesk / Agent</p>
          <h1 className="mt-1 text-2xl font-bold">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Your tickets and your team&apos;s unassigned queue.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${AGENT_BASE}/tickets/new`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New ticket for requester
          </Link>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? "—" : stat.value}</p>
            <p className="mt-2 text-xs text-slate-400">{stat.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-5">
          <div className="flex flex-wrap gap-2">
            {tabButton("mine", "My Tickets", mine.length)}
            {tabButton("team", "Team Queue (unassigned)", team.length)}
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              placeholder="Search number, subject, requester…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 sm:w-72"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by priority"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
            {hasFilters && (
              <button onClick={clearFilters} className="text-sm font-semibold text-blue-700 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button onClick={refresh} className="ml-3 font-semibold underline">
              Try again
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Ticket</th>
                <th className="px-5 py-4">Requester</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">SLA</th>
                <th className="px-5 py-4">Created</th>
                {tab === "team" && <th className="px-5 py-4">Action</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    Loading tickets…
                  </td>
                </tr>
              ) : visible.length > 0 ? (
                visible.map((t) => {
                  const sla = slaState(t, now);
                  return (
                    <tr key={t.ticket_id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <Link
                          href={`${AGENT_BASE}/tickets/${t.ticket_id}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {t.ticket_no}
                        </Link>
                        <p className="mt-1 text-slate-600">{t.subject}</p>
                      </td>
                      <td className="px-5 py-4">{t.requester_name}</td>
                      <td className="px-5 py-4">{t.category_name}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sla.className}`}>
                          {sla.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(t.created_at)}</td>
                      {tab === "team" && (
                        <td className="px-5 py-4">
                          <button
                            onClick={() => claim(t.ticket_id)}
                            disabled={claimingId === t.ticket_id}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {claimingId === t.ticket_id ? "Claiming…" : "Claim"}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    {hasFilters
                      ? "No matching tickets found."
                      : tab === "mine"
                      ? "No tickets are assigned to you yet."
                      : "No unassigned tickets in your team queue."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <span>
            Showing {loading ? "—" : visible.length} of {loading ? "—" : filtered.length} tickets
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
