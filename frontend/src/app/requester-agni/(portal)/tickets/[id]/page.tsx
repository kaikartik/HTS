"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import PriorityBadge from "../../../_components/PriorityBadge";
import PrimaryButton from "../../../_components/PrimaryButton";
import StatusBadge from "../../../_components/StatusBadge";
import { addReply, getTicket } from "../../../_lib/requesterApi";
import { themeClasses } from "../../../_lib/theme";
import type { Ticket, TicketReply } from "../../../_lib/types";

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

function formatTime(value: string): string {
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

function ConversationMessage({ reply }: { reply: TicketReply }) {
  const isAgent = reply.role === "Agent";

  return (
    <li className={`flex min-w-0 ${isAgent ? "justify-start" : "justify-end"}`}>
      <article className={`min-w-0 max-w-[90%] rounded-xl border px-4 py-3 ${isAgent ? "border-[#D9E2EF] bg-white" : "border-[#C6D9F0] bg-[#E6EEF8]"}`}>
        {isAgent && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B6B80]">Support agent</p>}
        <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${isAgent ? "" : "justify-end"}`}>
          <p className="break-words text-sm font-semibold text-[#0F1F33]">{reply.author}</p>
          <time className="text-xs text-[#5B6B80]" dateTime={reply.createdAt}>{formatTime(reply.createdAt)}</time>
        </div>
        <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#0F1F33] ${isAgent ? "" : "text-right"}`}>{reply.body}</p>
      </article>
    </li>
  );
}

export default function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

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

  const history = [...(ticket.history ?? [])].sort((first, second) => Date.parse(second.at) - Date.parse(first.at));
  const replies = (ticket.replies ?? [])
    .filter((reply) => !reply.isInternal)
    .sort((first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt));
  const optionalDetails = [
    { label: "Employee ID", value: ticket.employeeId },
    { label: "Department", value: ticket.department },
    { label: "Phone", value: ticket.phone },
    { label: "Location", value: ticket.location },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));
  const ticketId = ticket.id;

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = replyBody.trim();
    if (!body) {
      setReplyError("Write a reply before sending.");
      return;
    }

    setReplyError("");
    setIsSendingReply(true);
    try {
      const reply = await addReply(ticketId, body);
      setTicket((current) => current ? {
        ...current,
        updatedAt: reply.createdAt,
        replies: [...(current.replies ?? []).filter((entry) => !entry.isInternal), reply],
      } : current);
      setReplyBody("");
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "Your reply could not be sent. Please try again.");
    } finally {
      setIsSendingReply(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1180px]">
      <Link href="/requester-agni/tickets" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to My tickets</Link>
      <header className="mb-6 mt-3 rounded-xl border border-[#D9E2EF] bg-white p-5 sm:p-7">
        <p className="break-all text-sm font-semibold text-[#00448E]">{ticket.ticketNo}</p>
        <h1 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight text-[#0F1F33] sm:text-3xl">{ticket.subject}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)] lg:items-start">
        <section aria-labelledby="conversation-heading" className="min-w-0 rounded-xl border border-[#D9E2EF] bg-white p-5 sm:p-7">
          <h2 id="conversation-heading" className="text-lg font-semibold text-[#0F1F33]">Conversation</h2>
          {replies.length ? (
            <ol className="mt-5 space-y-4">
              {replies.map((reply) => <ConversationMessage key={reply.id} reply={reply} />)}
            </ol>
          ) : (
            <p className="mt-5 rounded-lg bg-[#F4F7FB] px-4 py-6 text-center text-sm text-[#5B6B80]">No replies yet</p>
          )}

          {ticket.status === "Closed" ? (
            <p className="mt-6 rounded-lg border border-[#D9E2EF] bg-[#F4F7FB] p-4 text-sm leading-6 text-[#5B6B80]">This ticket is closed. Raise a new ticket if you need more help.</p>
          ) : (
            <form onSubmit={handleReplySubmit} className="mt-6 border-t border-[#D9E2EF] pt-5">
              <label htmlFor="ticket-reply" className="text-sm font-semibold text-[#0F1F33]">Add a reply</label>
              <textarea
                id="ticket-reply"
                value={replyBody}
                onChange={(event) => {
                  setReplyBody(event.target.value);
                  if (replyError) setReplyError("");
                }}
                maxLength={1000}
                rows={4}
                aria-describedby={replyError ? "reply-error reply-counter" : "reply-counter"}
                aria-invalid={Boolean(replyError)}
                className={`${themeClasses.authInput} mt-2 h-auto min-h-28 resize-y py-3`}
              />
              <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
                {replyError ? <p id="reply-error" role="alert" className="text-sm text-[#a52d2a]">{replyError}</p> : <span />}
                <p id="reply-counter" className="ml-auto text-xs text-[#5B6B80]">{replyBody.length}/1000</p>
              </div>
              <div className="mt-4 flex justify-end">
                <PrimaryButton isLoading={isSendingReply} disabled={replyBody.length > 1000} className="sm:w-auto">Send</PrimaryButton>
              </div>
            </form>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="ticket-details-heading" className="min-w-0 rounded-xl border border-[#D9E2EF] bg-white p-5 sm:p-7">
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

          <section aria-labelledby="status-history-heading" className="min-w-0 rounded-xl border border-[#D9E2EF] bg-white p-5 sm:p-7">
            <h2 id="status-history-heading" className="text-lg font-semibold text-[#0F1F33]">Status history</h2>
            {history.length ? (
              <ol className="mt-5">
                {history.map((entry, index) => {
                  const isCurrent = index === 0 && entry.status === ticket.status;
                  return (
                    <li key={`${entry.at}-${entry.status}-${index}`} className={`relative min-w-0 border-l-2 pb-6 pl-4 last:border-transparent last:pb-0 ${isCurrent ? "border-[#00448E]" : "border-[#D9E2EF]"}`}>
                      <span aria-hidden="true" className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 ${isCurrent ? "border-[#00448E] bg-[#00448E]" : "border-[#9AAABC] bg-white"}`} />
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <StatusBadge status={entry.status} />
                        {isCurrent && <span className="text-xs font-semibold text-[#00448E]">Current</span>}
                      </div>
                      <time className="mt-2 block text-xs text-[#5B6B80]" dateTime={entry.at}>{formatTime(entry.at)}</time>
                      <p className="mt-1 break-words text-sm text-[#0F1F33]">Changed by {entry.by}</p>
                      {entry.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-[#5B6B80]">{entry.note}</p>}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-5 text-sm text-[#5B6B80]">No status history available.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
