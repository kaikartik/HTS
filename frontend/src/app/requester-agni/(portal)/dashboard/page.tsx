"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { PortalIcon, RequesterUserContext, type PortalIconName } from "../../_components/PortalShell";
import PriorityBadge from "../../_components/PriorityBadge";
import StatusBadge from "../../_components/StatusBadge";
import { getDashboardStats, getMyTickets } from "../../_lib/requesterApi";
import { themeClasses } from "../../_lib/theme";
import type { DashboardStats, Ticket } from "../../_lib/types";

const quickActions: { title: string; description: string; href: string; icon: PortalIconName }[] = [
  { title: "Raise a ticket", description: "Tell us what you need help with.", href: "/requester-agni/tickets/new", icon: "plus" },
  { title: "Track my tickets", description: "See updates on your requests.", href: "/requester-agni/tickets", icon: "ticket" },
  { title: "Search the Knowledge Base", description: "Browse helpful answers and guides.", href: "/requester-agni/kb", icon: "book" },
];

const statLabels: { key: keyof DashboardStats; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "open", label: "Open" },
  { key: "inProgress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

const recentTicketCount = 5;

function formatCreatedDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function RequesterDashboardPage() {
  const user = useContext(RequesterUserContext);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const firstName = user?.name.trim().split(/[\s._-]+/)[0] || "there";
  const greetingName = `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`;
  const isLoading = stats === null || tickets === null;

  useEffect(() => {
    let isActive = true;

    Promise.all([getDashboardStats(), getMyTickets()]).then(([nextStats, nextTickets]) => {
      if (!isActive) return;
      setStats(nextStats);
      setTickets(nextTickets);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const recentTickets = tickets?.slice(0, recentTicketCount) ?? [];

  return (
    <div>
      <div className="mb-9 max-w-2xl">
        <p className="mb-2 text-sm font-medium text-[#00448E]">Requester portal</p>
        <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight text-[#0F1F33] sm:text-3xl">Hi, {greetingName}! How can we help you today?</h1>
        <p className="mt-3 text-sm leading-6 text-[#5B6B80]">Choose a task to get started.</p>
      </div>

      <section aria-label="Ticket statistics" aria-busy={isLoading} className="mb-8 grid grid-cols-2 gap-3 md:mb-10 md:grid-cols-4 md:gap-4">
        {isLoading
          ? statLabels.map((stat) => (
            <div key={stat.key} aria-hidden="true" className="min-h-[88px] animate-pulse rounded-md border border-[#D9E2EF] bg-[#FFFFFF] p-4">
              <div className="h-3 w-16 rounded bg-[#E6EEF8]" />
              <div className="mt-4 h-7 w-10 rounded bg-[#E6EEF8]" />
            </div>
          ))
          : statLabels.map((stat) => (
            <div key={stat.key} className="min-h-[88px] rounded-md border border-[#D9E2EF] bg-[#FFFFFF] p-4">
              <p className="text-xs font-medium text-[#5B6B80]">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold leading-none text-[#0F1F33]">{stats[stat.key]}</p>
            </div>
          ))}
      </section>

      <section aria-label="Quick actions" className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} className="group flex min-h-48 flex-col rounded-md border border-[#D9E2EF] bg-[#FFFFFF] p-5 transition hover:-translate-y-0.5 hover:border-[#00448E]/40 hover:bg-[#E6EEF8] hover:shadow-[0_10px_28px_rgba(15,31,51,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] sm:p-6">
            <span className="mb-5 grid h-11 w-11 place-items-center rounded-md bg-[#E6EEF8] text-[#00448E] transition">
              <PortalIcon name={action.icon} className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold text-[#0F1F33]">{action.title}</span>
            <span className="mt-1.5 text-sm leading-5 text-[#5B6B80]">{action.description}</span>
          </Link>
        ))}
      </section>

      <section aria-labelledby="recent-tickets-heading" aria-busy={isLoading} className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="recent-tickets-heading" className="text-lg font-semibold text-[#0F1F33]">Recent tickets</h2>
            <p className="mt-1 text-sm text-[#5B6B80]">Your latest support requests</p>
          </div>
          <Link href="/requester-agni/tickets" className="shrink-0 rounded-sm text-sm font-semibold text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">View all</Link>
        </div>

        {isLoading ? (
          <div aria-label="Loading recent tickets" role="status" className="space-y-3">
            <div className="hidden overflow-hidden rounded-md border border-[#D9E2EF] bg-[#FFFFFF] md:block">
              {Array.from({ length: recentTicketCount }, (_, index) => (
                <div key={index} aria-hidden="true" className="grid animate-pulse grid-cols-[1.4fr_2.5fr_1.2fr_1fr_1fr] gap-4 border-b border-[#D9E2EF] px-4 py-4 last:border-b-0">
                  <div className="h-4 rounded bg-[#E6EEF8]" />
                  <div className="h-4 rounded bg-[#E6EEF8]" />
                  <div className="h-6 w-20 rounded-full bg-[#E6EEF8]" />
                  <div className="h-6 w-16 rounded-full bg-[#E6EEF8]" />
                  <div className="h-4 rounded bg-[#E6EEF8]" />
                </div>
              ))}
            </div>
            <div className="space-y-3 md:hidden">
              {Array.from({ length: recentTicketCount }, (_, index) => (
                <div key={index} aria-hidden="true" className="h-28 animate-pulse rounded-md border border-[#D9E2EF] bg-[#FFFFFF] p-4">
                  <div className="h-3 w-28 rounded bg-[#E6EEF8]" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-[#E6EEF8]" />
                  <div className="mt-4 h-6 w-32 rounded-full bg-[#E6EEF8]" />
                </div>
              ))}
            </div>
          </div>
        ) : recentTickets.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#D9E2EF] bg-[#FFFFFF] px-5 py-10 text-center">
            <p className="text-sm font-semibold text-[#0F1F33]">No tickets yet</p>
            <p className="mt-1 text-sm text-[#5B6B80]">When you submit a request, it will appear here.</p>
            <Link href="/requester-agni/tickets/new" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-[#00448E] px-4 text-sm font-semibold text-white transition hover:bg-[#003470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Raise a ticket</Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-md border border-[#D9E2EF] bg-[#FFFFFF] md:block">
              <table className="w-full table-fixed text-left">
                <thead className="bg-[#F4F7FB] text-xs font-semibold text-[#5B6B80]">
                  <tr>
                    <th scope="col" className="w-[19%] px-4 py-3">Ticket no.</th>
                    <th scope="col" className="w-[35%] px-4 py-3">Subject</th>
                    <th scope="col" className="w-[17%] px-4 py-3">Status</th>
                    <th scope="col" className="w-[13%] px-4 py-3">Priority</th>
                    <th scope="col" className="w-[16%] px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E2EF]">
                  {recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="transition-colors hover:bg-[#F4F7FB]">
                      <td className="truncate px-4 py-4 text-sm font-medium text-[#00448E]"><Link href={`/requester-agni/tickets/${ticket.id}`} className="hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">{ticket.ticketNo}</Link></td>
                      <td className="truncate px-4 py-4 text-sm font-medium text-[#0F1F33]"><Link href={`/requester-agni/tickets/${ticket.id}`} className="hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">{ticket.subject}</Link></td>
                      <td className="px-4 py-4"><StatusBadge status={ticket.status} /></td>
                      <td className="px-4 py-4"><PriorityBadge priority={ticket.priority} /></td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-[#5B6B80]">{formatCreatedDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {recentTickets.map((ticket) => (
                <article key={ticket.id} className="rounded-md border border-[#D9E2EF] bg-[#FFFFFF] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/requester-agni/tickets/${ticket.id}`} className="truncate text-xs font-semibold text-[#00448E] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">{ticket.ticketNo}</Link>
                    <time dateTime={ticket.createdAt} className="shrink-0 text-xs text-[#5B6B80]">{formatCreatedDate(ticket.createdAt)}</time>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-5 text-[#0F1F33]"><Link href={`/requester-agni/tickets/${ticket.id}`} className="break-words hover:text-[#00448E] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">{ticket.subject}</Link></h3>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}