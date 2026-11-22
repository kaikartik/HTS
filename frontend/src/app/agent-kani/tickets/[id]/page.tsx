"use client";

// Ticket detail: info, conversation thread, public reply / private note (FR-17),
// status controls (FR-18), claim/release, priority override (FR-14),
// attachments (FR-12), audit history (FR-19) and KB draft (FR-32).

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import { CANNED_RESPONSES, fillCanned } from "../../lib/canned";
import {
  AGENT_BASE,
  api,
  downloadAttachment,
  errorMessage,
  formatBytes,
  formatDate,
  isDone,
  isTrue,
  isViewable,
  priorityStyle,
  slaState,
  statusStyle,
  useNow,
  useSessionUser,
  viewAttachment,
  type TicketDetailResponse,
} from "../../lib/api";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800 break-words">{value}</dd>
    </div>
  );
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const me = useSessionUser();
  const now = useNow();
  const ticketId = params.id;

  const [data, setData] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // reply composer
  const [replyMode, setReplyMode] = useState<"public" | "internal">("public");
  const [replyText, setReplyText] = useState("");

  // status change
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");

  // priority override
  const [newPriority, setNewPriority] = useState("");
  const [priorityReason, setPriorityReason] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await api<TicketDetailResponse>(`/tickets/${ticketId}`);
      setData(response);
      setLoadError("");
    } catch (err) {
      setLoadError(errorMessage(err, "Could not load this ticket."));
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [load]);

  // Run an action, show its message, then reload the ticket.
  async function run(action: () => Promise<{ message?: string }>, onSuccess?: () => void) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await action();
      setNotice({ type: "ok", text: result.message || "Done." });
      onSuccess?.();
      await load();
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const sendReply = () =>
    run(
      () =>
        api(`/tickets/${ticketId}/comments`, {
          method: "POST",
          body: { body: replyText, is_internal: replyMode === "internal" },
        }),
      () => setReplyText("")
    );

  const confirmStatus = () =>
    run(
      () =>
        api(`/tickets/${ticketId}/status`, {
          method: "PATCH",
          body: { status: pendingStatus, note: statusNote },
        }),
      () => {
        setPendingStatus(null);
        setStatusNote("");
      }
    );

  const claim = () => run(() => api(`/tickets/${ticketId}/claim`, { method: "POST" }));
  const release = () => run(() => api(`/tickets/${ticketId}/release`, { method: "POST" }));

  const changePriority = () =>
    run(
      () =>
        api(`/tickets/${ticketId}/priority`, {
          method: "PATCH",
          body: { priority: newPriority, reason: priorityReason },
        }),
      () => {
        setNewPriority("");
        setPriorityReason("");
      }
    );

  async function createKbDraft() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await api<{ article_id: number }>(`/tickets/${ticketId}/kb-draft`, {
        method: "POST",
      });
      router.push(`${AGENT_BASE}/kb?edit=${result.article_id}`);
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
      setBusy(false);
    }
  }

  async function view(id: number) {
    try {
      await viewAttachment(id);
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    }
  }

  async function download(id: number, name: string) {
    try {
      await downloadAttachment(id, name);
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading ticket…</p>;
  }

  if (loadError || !data) {
    return (
      <div className="space-y-4">
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError || "Ticket not found."}
        </div>
        <Link href={AGENT_BASE} className="text-sm font-medium text-blue-700 hover:underline">
          ← Back to ticket queue
        </Link>
      </div>
    );
  }

  const { ticket, comments, attachments, history, permissions } = data;
  const sla = slaState(ticket, now);
  const closed = ticket.status === "Closed";
  const canReply = permissions.can_work && !closed;
  const canChangePriority = permissions.can_work && !isDone(ticket.status);
  const canRelease = permissions.can_work && ["New", "Open"].includes(ticket.status);
  const canMakeDraft = permissions.can_work && isDone(ticket.status);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Overview", href: AGENT_BASE },
            { label: "Tickets" },
            { label: ticket.ticket_no },
          ]}
        />

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">{ticket.ticket_no}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{ticket.subject}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(ticket.status)}`}>
              {ticket.status}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(ticket.priority)}`}>
              {ticket.priority}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sla.className}`}>
              SLA: {sla.label}
            </span>
          </div>
        </div>
      </div>

      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`rounded-lg border p-3 text-sm ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {permissions.can_claim && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <span>This ticket is unassigned in your team queue. Claim it to reply or change its status.</span>
          <button
            onClick={claim}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Claim ticket
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------- left: description + conversation ---------------- */}
        <div className="space-y-6 lg:col-span-2">
          <Card title="Description">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
          </Card>

          <Card title={`Conversation (${comments.length})`}>
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">No messages yet.</p>
            ) : (
              <ul className="space-y-4">
                {comments.map((c) => {
                  const internal = isTrue(c.is_internal);
                  const mine = me?.user_id === c.author_id;
                  const fromRequester = c.author_id === ticket.requester_id;

                  return (
                    <li key={c.comment_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-xl border p-4 text-sm ${
                          internal
                            ? "border-amber-300 bg-amber-50"
                            : mine
                            ? "border-blue-200 bg-blue-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{c.author_name}</span>
                          {fromRequester && <span className="rounded bg-slate-200 px-1.5 py-0.5">Requester</span>}
                          {internal && (
                            <span className="rounded bg-amber-200 px-1.5 py-0.5 font-semibold text-amber-900">
                              Private note · hidden from requester
                            </span>
                          )}
                          <span>{formatDate(c.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-slate-800">{c.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              {canReply ? (
                <>
                  <div className="mb-3 flex gap-2">
                    <button
                      onClick={() => setReplyMode("public")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        replyMode === "public" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Public reply
                    </button>
                    <button
                      onClick={() => setReplyMode("internal")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        replyMode === "internal" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Private note
                    </button>
                  </div>

                  {replyMode === "public" && (
                    <select
                      value=""
                      onChange={(e) => {
                        const canned = CANNED_RESPONSES.find((c) => c.label === e.target.value);
                        if (canned) {
                          const text = fillCanned(canned.body, ticket.requester_name);
                          setReplyText(replyText.trim() ? `${replyText}\n\n${text}` : text);
                        }
                      }}
                      aria-label="Insert canned response"
                      className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-72"
                    >
                      <option value="">Insert canned response…</option>
                      {CANNED_RESPONSES.map((c) => (
                        <option key={c.label}>{c.label}</option>
                      ))}
                    </select>
                  )}

                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder={
                      replyMode === "public"
                        ? "Write a reply the requester will see…"
                        : "Write an internal note. The requester will never see this."
                    }
                    className={`w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-blue-500 ${
                      replyMode === "internal" ? "border-amber-300 bg-amber-50" : "border-slate-300"
                    }`}
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {replyMode === "public"
                        ? "Visible to the requester."
                        : "Only agents and supervisors can see this note."}
                    </p>
                    <button
                      onClick={sendReply}
                      disabled={busy || !replyText.trim()}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {replyMode === "public" ? "Send reply" : "Add note"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  {closed
                    ? "This ticket is closed, so no new messages can be added."
                    : "Claim this ticket to reply to the requester."}
                </p>
              )}
            </div>
          </Card>

          <Card title={`Attachments (${attachments.length})`}>
            {attachments.length === 0 ? (
              <p className="text-sm text-slate-500">No attachments on this ticket.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {attachments.map((a) => (
                  <li key={a.attachment_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{a.file_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(a.size_bytes)} · {a.uploaded_by_name} · {formatDate(a.uploaded_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {isViewable(a.file_name) && (
                        <button
                          onClick={() => view(a.attachment_id)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={() => download(a.attachment_id, a.file_name)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Download
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ---------------- right: actions + info + history ---------------- */}
        <div className="space-y-6">
          <Card title="Actions">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">Change status</p>
                {permissions.allowed_statuses.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {permissions.can_work
                      ? "No status changes are available for this ticket."
                      : "Claim the ticket to change its status."}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {permissions.allowed_statuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setPendingStatus(s);
                          setStatusNote("");
                        }}
                        disabled={busy}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                          pendingStatus === s
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {pendingStatus && (
                  <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                    <label htmlFor="status-note" className="block text-xs font-semibold text-slate-600">
                      {pendingStatus === "Resolved"
                        ? "Describe the solution (sent to the requester) *"
                        : "Message to requester (optional)"}
                    </label>
                    <textarea
                      id="status-note"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={confirmStatus}
                        disabled={busy || (pendingStatus === "Resolved" && !statusNote.trim())}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Set to {pendingStatus}
                      </button>
                      <button
                        onClick={() => setPendingStatus(null)}
                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {canChangePriority && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">Override priority</p>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    aria-label="New priority"
                  >
                    <option value="">Select new priority…</option>
                    {PRIORITIES.filter((p) => p !== ticket.priority).map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  {newPriority && (
                    <div className="mt-2 space-y-2">
                      <input
                        value={priorityReason}
                        onChange={(e) => setPriorityReason(e.target.value)}
                        placeholder="Reason (required)"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={changePriority}
                        disabled={busy || !priorityReason.trim()}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Change priority
                      </button>
                    </div>
                  )}
                </div>
              )}

              {canRelease && (
                <button
                  onClick={release}
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Release back to team queue
                </button>
              )}

              {canMakeDraft && (
                <button
                  onClick={createKbDraft}
                  disabled={busy}
                  className="w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  Create Knowledge Base draft
                </button>
              )}
            </div>
          </Card>

          <Card title="Ticket details">
            <dl>
              <InfoRow label="Requester" value={ticket.requester_name} />
              <InfoRow label="Email" value={ticket.requester_email} />
              <InfoRow label="Phone" value={ticket.requester_phone || "—"} />
              <InfoRow label="Category" value={ticket.category_name} />
              <InfoRow label="Team" value={ticket.team_name} />
              <InfoRow label="Assigned to" value={ticket.assignee_name || "Unassigned"} />
              <InfoRow label="Channel" value={ticket.channel} />
              <InfoRow label="Created" value={formatDate(ticket.created_at)} />
              <InfoRow label="First response" value={formatDate(ticket.first_response_at)} />
              <InfoRow label="Response due" value={formatDate(ticket.response_due)} />
              <InfoRow label="Resolution due" value={formatDate(ticket.resolution_due)} />
              <InfoRow label="Time on hold" value={`${ticket.paused_minutes} min`} />
              {ticket.resolved_at && <InfoRow label="Resolved" value={formatDate(ticket.resolved_at)} />}
              {ticket.escalated_at && <InfoRow label="Escalated" value={formatDate(ticket.escalated_at)} />}
            </dl>
          </Card>

          <Card title="History">
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No changes recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.history_id} className="text-sm">
                    <p className="text-slate-800">
                      <span className="font-semibold">{h.changed_by_name}</span> changed{" "}
                      <span className="font-mono text-xs">{h.field_name}</span>
                      {h.old_value !== null && (
                        <>
                          {" "}
                          from <span className="font-medium">{h.old_value}</span>
                        </>
                      )}
                      {h.new_value !== null && (
                        <>
                          {" "}
                          to <span className="font-medium">{h.new_value}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(h.changed_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
