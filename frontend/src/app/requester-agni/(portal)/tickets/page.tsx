"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ChangeEvent } from "react";
import PriorityBadge from "../../_components/PriorityBadge";
import StatusBadge from "../../_components/StatusBadge";
import TextField from "../../_components/TextField";
import { ticketCategories } from "../../_lib/categories";
import { getMyTickets } from "../../_lib/requesterApi";
import { themeClasses } from "../../_lib/theme";
import type { Ticket, TicketPriority, TicketStatus } from "../../_lib/types";

const statuses: TicketStatus[] = ["New", "Open", "In Progress", "On Hold", "Resolved", "Closed", "Reopened"];
const priorities: TicketPriority[] = ["Low", "Medium", "High", "Critical"];
const priorityRank: Record<TicketPriority, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const pageSize = 25;

type SortOrder = "newest" | "oldest" | "priority" | "status";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function LoadingTickets() {
  return (
    <div role="status" aria-label="Loading tickets" className="space-y-3">
      <div className="hidden overflow-hidden rounded-md border border-[#D9E2EF] bg-white md:block">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} aria-hidden="true" className="grid animate-pulse grid-cols-7 gap-3 border-b border-[#D9E2EF] px-4 py-4 last:border-0">
            {Array.from({ length: 7 }, (_, cell) => <div key={cell} className="h-5 rounded bg-[#E6EEF8]" />)}
          </div>
        ))}
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }, (_, index) => <div key={index} aria-hidden="true" className="h-40 animate-pulse rounded-md border border-[#D9E2EF] bg-white p-4" />)}
      </div>
    </div>
  );
}

function MyTicketsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    getMyTickets()
      .then((result) => {
        if (active) setTickets(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Could not load your tickets.");
      });

    return () => {
      active = false;
    };
  }, []);

  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const category = searchParams.get("category") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sortParam = searchParams.get("sort");
  const sort: SortOrder = sortParam === "oldest" || sortParam === "priority" || sortParam === "status" ? sortParam : "newest";
  const requestedPage = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const categoryOptions = useMemo(() => [...new Set([
    ...Object.keys(ticketCategories),
    ...(tickets ?? []).map((ticket) => ticket.category),
  ])].sort((a, b) => a.localeCompare(b)), [tickets]);

  function updateQuery(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");

    const queryString = next.toString();
    window.history.replaceState(null, "", queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleSelectChange(key: string) {
    return (event: ChangeEvent<HTMLSelectElement>) => updateQuery(key, event.target.value);
  }

  function clearFilters() {
    window.history.replaceState(null, "", pathname);
  }

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const statusRank = new Map(statuses.map((value, index) => [value, index]));

    return tickets
      .filter((ticket) => {
        const matchesQuery = !normalizedQuery || [ticket.ticketNo, ticket.subject, ticket.description]
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
        const createdDate = ticket.createdAt.slice(0, 10);
        return matchesQuery
          && (!status || ticket.status === status)
          && (!priority || ticket.priority === priority)
          && (!category || ticket.category === category)
          && (!from || createdDate >= from)
          && (!to || createdDate <= to);
      })
      .sort((first, second) => {
        if (sort === "oldest") return Date.parse(first.createdAt) - Date.parse(second.createdAt);
        if (sort === "priority") return priorityRank[second.priority] - priorityRank[first.priority]
          || Date.parse(second.createdAt) - Date.parse(first.createdAt);
        if (sort === "status") return (statusRank.get(first.status) ?? 0) - (statusRank.get(second.status) ?? 0)
          || Date.parse(second.createdAt) - Date.parse(first.createdAt);
        return Date.parse(second.createdAt) - Date.parse(first.createdAt);
      });
  }, [tickets, query, status, priority, category, from, to, sort]);

  if (tickets === null && !loadError) {
    return (
      <div>
        <PageHeader />
        <LoadingTickets />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <PageHeader />
        <p role="alert" className="rounded-lg border border-[#f1c7c3] bg-[#fbf1ef] p-4 text-sm text-[#a52d2a]">{loadError}</p>
      </div>
    );
  }

  const allTickets = tickets ?? [];
  const pageCount = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const currentPage = Math.min(requestedPage, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleTickets = filteredTickets.slice(startIndex, startIndex + pageSize);
  const firstVisible = filteredTickets.length ? startIndex + 1 : 0;
  const lastVisible = Math.min(startIndex + pageSize, filteredTickets.length);
  const hasFilters = Boolean(query || status || priority || category || from || to || sort !== "newest");
  const firstPageNumber = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPageNumber + index);

  return (
    <div>
      <PageHeader />

      <section aria-label="Ticket filters" className="mb-6 rounded-xl border border-[#D9E2EF] bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <TextField
              id="ticket-search"
              label="Search tickets"
              type="search"
              value={query}
              placeholder="Search ticket number, subject or description"
              onChange={(event) => updateQuery("q", event.target.value)}
            />
          </div>
          <FilterSelect id="ticket-status-filter" label="Status" value={status} onChange={handleSelectChange("status")}>
            <option value="">All statuses</option>
            {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </FilterSelect>
          <FilterSelect id="ticket-priority-filter" label="Priority" value={priority} onChange={handleSelectChange("priority")}>
            <option value="">All priorities</option>
            {priorities.map((value) => <option key={value} value={value}>{value}</option>)}
          </FilterSelect>
          <FilterSelect id="ticket-category-filter" label="Category" value={category} onChange={handleSelectChange("category")}>
            <option value="">All categories</option>
            {categoryOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </FilterSelect>
          <FilterSelect id="ticket-sort" label="Sort" value={sort} onChange={handleSelectChange("sort")}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority high to low</option>
            <option value="status">Status</option>
          </FilterSelect>
          <div>
            <label htmlFor="ticket-from-date" className="mb-2 block text-sm font-medium text-[#0F1F33]">From</label>
            <input id="ticket-from-date" type="date" value={from} onChange={(event) => updateQuery("from", event.target.value)} className={themeClasses.authInput} />
          </div>
          <div>
            <label htmlFor="ticket-to-date" className="mb-2 block text-sm font-medium text-[#0F1F33]">To</label>
            <input id="ticket-to-date" type="date" value={to} onChange={(event) => updateQuery("to", event.target.value)} className={themeClasses.authInput} />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-2">
            <button type="button" onClick={clearFilters} className="min-h-12 rounded-xl border border-[#D9E2EF] px-4 text-sm font-semibold text-[#00448E] transition hover:bg-[#F4F7FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Clear filters</button>
          </div>
        </div>
      </section>

      {filteredTickets.length === 0 ? (
        allTickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D9E2EF] bg-white px-5 py-12 text-center">
            <h2 className="text-base font-semibold text-[#0F1F33]">You have not raised any tickets yet</h2>
            <Link href="/requester-agni/tickets/new" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#00448E] px-5 text-sm font-semibold text-white hover:bg-[#003470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Raise a ticket</Link>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#D9E2EF] bg-white px-5 py-12 text-center">
            <h2 className="text-base font-semibold text-[#0F1F33]">No tickets match your filters</h2>
            {hasFilters && <button type="button" onClick={clearFilters} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D9E2EF] px-5 text-sm font-semibold text-[#00448E] hover:bg-[#F4F7FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Clear filters</button>}
          </div>
        )
      ) : (
        <>
          <p className="mb-3 text-sm text-[#5B6B80]" aria-live="polite">Showing {firstVisible}-{lastVisible} of {filteredTickets.length} tickets</p>
          <div className="hidden overflow-hidden rounded-xl border border-[#D9E2EF] bg-white md:block">
            <table className="w-full table-fixed text-left">
              <thead className="bg-[#F4F7FB] text-xs font-semibold text-[#5B6B80]">
                <tr>
                  <th scope="col" className="w-[13%] px-3 py-3">Ticket no.</th>
                  <th scope="col" className="w-[19%] px-3 py-3">Subject</th>
                  <th scope="col" className="w-[14%] px-3 py-3">Category</th>
                  <th scope="col" className="w-[12%] px-3 py-3">Status</th>
                  <th scope="col" className="w-[11%] px-3 py-3">Priority</th>
                  <th scope="col" className="w-[12%] px-3 py-3">Created</th>
                  <th scope="col" className="w-[12%] px-3 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E2EF]">
                {visibleTickets.map((ticket) => <TicketTableRow key={ticket.id} ticket={ticket} />)}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {visibleTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
          {pageCount > 1 && (
            <nav aria-label="Ticket pagination" className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => updateQuery("page", String(currentPage - 1))} className="min-h-12 rounded-lg border border-[#D9E2EF] px-3 text-sm font-medium text-[#00448E] disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
              {firstPageNumber > 1 && <span className="px-1 text-sm text-[#5B6B80]" aria-hidden="true">…</span>}
              {pageNumbers.map((pageNumber) => (
                <button key={pageNumber} type="button" aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => updateQuery("page", String(pageNumber))} className={`grid h-12 min-w-12 place-items-center rounded-lg border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] ${pageNumber === currentPage ? "border-[#00448E] bg-[#E6EEF8] text-[#00448E]" : "border-[#D9E2EF] text-[#5B6B80] hover:bg-[#F4F7FB]"}`}>{pageNumber}</button>
              ))}
              {firstPageNumber + pageNumbers.length - 1 < pageCount && <span className="px-1 text-sm text-[#5B6B80]" aria-hidden="true">…</span>}
              <button type="button" disabled={currentPage === pageCount} onClick={() => updateQuery("page", String(currentPage + 1))} className="min-h-12 rounded-lg border border-[#D9E2EF] px-3 text-sm font-medium text-[#00448E] disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-[#00448E]">Requester portal</p>
        <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight text-[#0F1F33] sm:text-3xl">My tickets</h1>
      </div>
      <Link href="/requester-agni/tickets/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#00448E] px-4 text-sm font-semibold text-white transition hover:bg-[#003470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">
        <span aria-hidden="true" className="text-lg leading-none">+</span>
        Raise a ticket
      </Link>
    </div>
  );
}

function FilterSelect({ id, label, value, onChange, children }: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#0F1F33]">{label}</label>
      <select id={id} value={value} onChange={onChange} className={themeClasses.authInput}>{children}</select>
    </div>
  );
}

function TicketTableRow({ ticket }: { ticket: Ticket }) {
  const href = `/requester-agni/tickets/${encodeURIComponent(ticket.id)}`;
  return (
    <tr className="transition-colors hover:bg-[#F4F7FB]">
      <td className="break-all px-3 py-4 text-sm font-medium"><Link href={href} className="text-[#00448E] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">{ticket.ticketNo}</Link></td>
      <td className="break-words px-3 py-4 text-sm font-medium"><Link href={href} className="text-[#0F1F33] underline-offset-2 hover:text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">{ticket.subject}</Link></td>
      <td className="break-words px-3 py-4 text-sm text-[#5B6B80]">{ticket.category}</td>
      <td className="px-3 py-4"><StatusBadge status={ticket.status} /></td>
      <td className="px-3 py-4"><PriorityBadge priority={ticket.priority} /></td>
      <td className="px-3 py-4 text-sm text-[#5B6B80]">{formatDate(ticket.createdAt)}</td>
      <td className="px-3 py-4 text-sm text-[#5B6B80]">{formatDate(ticket.updatedAt)}</td>
    </tr>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const href = `/requester-agni/tickets/${encodeURIComponent(ticket.id)}`;
  return (
    <article className="min-w-0 rounded-xl border border-[#D9E2EF] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link href={href} className="break-all text-sm font-semibold text-[#00448E] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">{ticket.ticketNo}</Link>
        <div className="flex flex-wrap gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
      </div>
      <h2 className="mt-2 break-words text-base font-semibold leading-6 text-[#0F1F33]">
        <Link href={href} className="underline-offset-2 hover:text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">{ticket.subject}</Link>
      </h2>
      <p className="mt-1 break-words text-sm text-[#5B6B80]">{ticket.category}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#D9E2EF] pt-3 text-xs">
        <div><dt className="text-[#5B6B80]">Created</dt><dd className="mt-0.5 font-medium text-[#0F1F33]">{formatDate(ticket.createdAt)}</dd></div>
        <div><dt className="text-[#5B6B80]">Updated</dt><dd className="mt-0.5 font-medium text-[#0F1F33]">{formatDate(ticket.updatedAt)}</dd></div>
      </dl>
    </article>
  );
}

export default function MyTicketsPage() {
  return <Suspense fallback={<div><PageHeader /><LoadingTickets /></div>}><MyTicketsContent /></Suspense>;
}
