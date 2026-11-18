"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PriorityBadge from "../../../_components/PriorityBadge";
import StatusBadge from "../../../_components/StatusBadge";
import { getTicket } from "../../../_lib/requesterApi";
import type { Ticket } from "../../../_lib/types";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium text-[#5B6B80]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#0F1F33]">{value}</dd></div>;
}

export default function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    setTicket(null);
    setIsLoading(true);
    setLoadError("");

    getTicket(id)
      .then((result) => {
        if (active) setTicket(result);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load this ticket.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px]">
        <Link href="/requester-agni/tickets" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to My tickets</Link>
        <div role="status" aria-label="Loading ticket" className="mt-5 animate-pulse rounded-xl border border-[#D9E2EF] bg-white p-6">
          <div className="h-4 w-32 rounded bg-[#E6EEF8]" />
          <div className="mt-4 h-7 w-2/3 rounded bg-[#E6EEF8]" />
          <div className="mt-7 h-40 rounded bg-[#F4F7FB]" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[900px]">
        <Link href="/requester-agni/tickets" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to My tickets</Link>
        <p role="alert" className="mt-4 rounded-lg border border-[#f1c7c3] bg-[#fbf1ef] p-4 text-sm text-[#a52d2a]">{loadError}</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-[900px]">
        <Link href="/requester-agni/tickets" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to My tickets</Link>
        <section className="mt-4 rounded-xl border border-dashed border-[#D9E2EF] bg-white px-5 py-12 text-center">
          <h1 className="text-xl font-semibold text-[#0F1F33]">Not found</h1>
          <p className="mt-2 text-sm text-[#5B6B80]">This ticket does not exist or is no longer available.</p>
        </section>
      </div>
    );
  }

  const optionalDetails = [
    { label: "Employee ID", value: ticket.employeeId },
    { label: "Department", value: ticket.department },
    { label: "Phone", value: ticket.phone },
    { label: "Location", value: ticket.location },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));

  return (
    <div className="mx-auto max-w-[900px]">
      <Link href="/requester-agni/tickets" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to My tickets</Link>
      <header className="mb-6 mt-3 rounded-xl border border-[#D9E2EF] bg-white p-5 sm:p-7">
        <p className="break-all text-sm font-semibold text-[#00448E]">{ticket.ticketNo}</p>
        <h1 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight text-[#0F1F33] sm:text-3xl">{ticket.subject}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </header>

      <section aria-labelledby="ticket-details-heading" className="rounded-xl border border-[#D9E2EF] bg-white p-5 sm:p-7">
        <h2 id="ticket-details-heading" className="text-lg font-semibold text-[#0F1F33]">Ticket details</h2>
        <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <DetailValue label="Category" value={ticket.category} />
          <DetailValue label="Sub-category" value={ticket.subCategory} />
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-[#5B6B80]">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#0F1F33]">{ticket.description}</dd>
          </div>
          <DetailValue label="Created" value={formatDate(ticket.createdAt)} />
          <DetailValue label="Last updated" value={formatDate(ticket.updatedAt)} />
          {optionalDetails.map((detail) => <DetailValue key={detail.label} label={detail.label} value={detail.value} />)}
        </dl>
      </section>
    </div>
  );
}
