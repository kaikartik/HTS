/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog, Drawer, EmptyState, PriorityBadge, Skeleton, SlaBadge, StatusBadge, Toast } from "@/components/khushaan/ui";
import styles from "@/components/khushaan/console.module.css";
import { assignTicket, listCategories, listTicketComments, listTicketHistory, listTickets, listTeams, listUsers, mergeTickets } from "@/lib/khushaan/api";
import { mockSlaPolicies } from "@/lib/khushaan/mock-data";
import { getSlaMetrics } from "@/lib/khushaan/sla";
import { strings } from "@/lib/khushaan/strings";
import type { Comment, Priority, Ticket, TicketFilters, TicketHistory, TicketStatus, User } from "@/lib/khushaan/types";

function TicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerTicket, setDrawerTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTeam, setAssignTeam] = useState("");
  const [assignUser, setAssignUser] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Array<{ team_id: string; team_name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ category_id: string; category_name: string }>>([]);

  const filters = useMemo<TicketFilters>(() => ({
    query: searchParams.get("q") ?? "",
    status: (searchParams.get("status") as TicketStatus | "") || "",
    priority: (searchParams.get("priority") as Priority | "") || "",
    category_id: searchParams.get("category") ?? "",
    team_id: searchParams.get("team") ?? "",
    assignee_id: searchParams.get("assignee") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    page: Math.max(1, Number(searchParams.get("page") ?? 1)),
    page_size: 25,
    sort_by: (searchParams.get("sort") as keyof Ticket) || "updated_at",
    sort_direction: searchParams.get("direction") === "asc" ? "asc" : "desc",
  }), [searchParams]);

  const setParam = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value); else next.delete(key);
    if (!["q", "page"].includes(key) || key === "q") next.delete("page");
    router.replace(`/supervisor-khus/tickets?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, userRows, teamRows, categoryRows] = await Promise.all([listTickets(filters), listUsers(), listTeams(), listCategories()]);
      setTickets(page.items);
      setTotal(page.total);
      setUsers(userRows);
      setTeams(teamRows);
      setCategories(categoryRows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const openDrawer = async (ticket: Ticket) => {
    setDrawerTicket(ticket);
    setAssignTeam(ticket.team_id);
    setAssignUser(ticket.assignee_id ?? "");
    const [ticketComments, ticketHistory] = await Promise.all([listTicketComments(ticket.ticket_no), listTicketHistory(ticket.ticket_no)]);
    setComments(ticketComments);
    setHistory(ticketHistory);
  };

  const policyFor = (ticket: Ticket) => mockSlaPolicies.find((policy) => policy.priority === ticket.priority) ?? mockSlaPolicies[1];
  const assigneeName = (ticket: Ticket) => users.find((user) => user.user_id === ticket.assignee_id)?.name ?? "Unassigned";
  const teamName = (teamId: string) => teams.find((team) => team.team_id === teamId)?.team_name ?? teamId;
  const categoryName = (categoryId: string) => categories.find((category) => category.category_id === categoryId)?.category_name ?? categoryId;

  const sortBy = (key: keyof Ticket) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("sort", key);
    next.set("direction", filters.sort_by === key && filters.sort_direction === "asc" ? "desc" : "asc");
    next.delete("page");
    router.replace(`/supervisor-khus/tickets?${next.toString()}`, { scroll: false });
  };

  const toggleSelected = (ticketNo: string) => setSelected((current) => current.includes(ticketNo) ? current.filter((item) => item !== ticketNo) : [...current, ticketNo]);
  const pageCount = Math.max(1, Math.ceil(total / 25));
  const page = filters.page ?? 1;

  const confirmMerge = async () => {
    if (selected.length < 2) return;
    try {
      await mergeTickets(selected[0], selected.slice(1));
      setToast(`${selected.length} tickets merged successfully.`);
      setSelected([]);
      setMergeOpen(false);
      await load();
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "Unable to merge tickets.");
      setMergeOpen(false);
    }
  };

  const confirmAssign = async () => {
    if (!drawerTicket) return;
    try {
      const updated = await assignTicket(drawerTicket.ticket_no, assignUser || null, assignTeam || undefined);
      setDrawerTicket(updated);
      setAssignOpen(false);
      setToast(`Ticket ${updated.ticket_no} reassigned successfully.`);
      await load();
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "Unable to assign ticket.");
      setAssignOpen(false);
    }
  };

  return (
    <div className={styles.ticketPage}>
      <div className={styles.dashboardHeader}>
        <div><p className={styles.pageEyebrow}>Ticket operations</p><h1 className={styles.pageTitle}>{strings.nav.tickets}</h1></div>
        {selected.length >= 2 && <button className={styles.buttonPrimary} onClick={() => setMergeOpen(true)} type="button">Merge {selected.length} selected</button>}
      </div>

      <section aria-label="Ticket filters" className={styles.ticketFilters}>
        <label>Search<input onChange={(event) => setParam("q", event.target.value)} placeholder="Ticket number or subject" value={filters.query ?? ""} /></label>
        <label>Status<select onChange={(event) => setParam("status", event.target.value)} value={filters.status ?? ""}><option value="">All statuses</option>{["New", "Open", "In Progress", "On Hold", "Resolved", "Closed", "Reopened"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Priority<select onChange={(event) => setParam("priority", event.target.value)} value={filters.priority ?? ""}><option value="">All priorities</option>{["Low", "Medium", "High", "Critical"].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
        <label>Category<select onChange={(event) => setParam("category", event.target.value)} value={filters.category_id ?? ""}><option value="">All categories</option>{categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}</select></label>
        <label>Team<select onChange={(event) => setParam("team", event.target.value)} value={filters.team_id ?? ""}><option value="">All teams</option>{teams.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}</select></label>
        <label>Assignee<select onChange={(event) => setParam("assignee", event.target.value)} value={filters.assignee_id ?? ""}><option value="">All assignees</option>{users.filter((user) => user.role === "Agent").map((user) => <option key={user.user_id} value={user.user_id}>{user.name}</option>)}</select></label>
        <label>From date<input onChange={(event) => setParam("from", event.target.value)} type="date" value={filters.from ?? ""} /></label>
        <label>To date<input onChange={(event) => setParam("to", event.target.value)} type="date" value={filters.to ?? ""} /></label>
      </section>

      {loading ? <Skeleton label="Loading tickets" rows={8} /> : error ? (
        <section className={styles.emptyState}><h2>{strings.common.errorTitle}</h2><p>{error}</p><button className={styles.buttonPrimary} onClick={() => void load()} type="button">{strings.common.retry}</button></section>
      ) : tickets.length ? (
        <div className={styles.tableFrame} style={{ maxWidth: "100%", overflowX: "auto" }}>
          <table className={styles.table}><caption className={styles.visuallyHidden}>Ticket list</caption>
            <thead><tr><th scope="col"><span className={styles.visuallyHidden}>Select</span></th>{[
              ["ticket_no", "Ticket"], ["subject", "Subject"], ["status", "Status"], ["priority", "Priority"], ["team_id", "Team"], ["assignee_id", "Assignee"], ["created_at", "Created"], ["sla", "SLA"]
            ].map(([key, label]) => <th key={key} scope="col"><button className={styles.sortButton} disabled={key === "sla"} onClick={() => key !== "sla" && sortBy(key as keyof Ticket)} type="button">{label}{filters.sort_by === key ? (filters.sort_direction === "asc" ? " ↑" : " ↓") : key === "sla" ? "" : " ↕"}</button></th>)}</tr></thead>
            <tbody>{tickets.map((ticket) => {
              const metrics = getSlaMetrics(ticket, policyFor(ticket));
              const breached = ticket.is_breached || metrics.state === "breached";
              return <tr className={breached ? styles.breachedRow : undefined} key={ticket.ticket_no}>
                <td><input aria-label={`Select ${ticket.ticket_no}`} checked={selected.includes(ticket.ticket_no)} onChange={() => toggleSelected(ticket.ticket_no)} type="checkbox" /></td>
                <td><button className={styles.ticketLinkButton} onClick={() => void openDrawer(ticket)} type="button">{ticket.ticket_no}</button></td>
                <td><button className={styles.ticketLinkButton} onClick={() => void openDrawer(ticket)} type="button">{ticket.subject}</button></td>
                <td><StatusBadge status={ticket.status} /></td><td><PriorityBadge priority={ticket.priority} /></td>
                <td>{teamName(ticket.team_id)}</td><td>{assigneeName(ticket)}</td>
                <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                <td><SlaBadge state={breached ? "breached" : metrics.state} percent={metrics.percent_elapsed} /></td>
              </tr>;
            })}</tbody>
          </table>
          <div className={styles.pagination}><span>{total} {strings.common.rows}</span><div className={styles.paginationControls}><button disabled={page <= 1} onClick={() => setParam("page", String(page - 1))} type="button">‹</button><span>{strings.common.page} {page} {strings.common.of} {pageCount}</span><button disabled={page >= pageCount} onClick={() => setParam("page", String(page + 1))} type="button">›</button></div></div>
        </div>
      ) : <EmptyState />}

      <Drawer open={Boolean(drawerTicket)} title={drawerTicket ? `${drawerTicket.ticket_no} — ${drawerTicket.subject}` : "Ticket"} onClose={() => setDrawerTicket(null)}>
        {drawerTicket && <div className={styles.drawerContent}>
          <div className={styles.drawerActions}><button className={styles.buttonPrimary} onClick={() => setAssignOpen(true)} type="button">Assign / reassign</button></div>
          <p>{drawerTicket.description}</p>
          <dl className={styles.ticketDetails}><div><dt>Status</dt><dd><StatusBadge status={drawerTicket.status} /></dd></div><div><dt>Priority</dt><dd><PriorityBadge priority={drawerTicket.priority} /></dd></div><div><dt>Team</dt><dd>{teamName(drawerTicket.team_id)}</dd></div><div><dt>Category</dt><dd>{categoryName(drawerTicket.category_id)}</dd></div><div><dt>Assignee</dt><dd>{assigneeName(drawerTicket)}</dd></div></dl>
          <section><h3>SLA information</h3><p>Resolution: {getSlaMetrics(drawerTicket, policyFor(drawerTicket)).percent_elapsed}% elapsed</p><p>First response: {getSlaMetrics(drawerTicket, policyFor(drawerTicket)).first_response_percent_elapsed}% elapsed</p></section>
          <section><h3>Status history</h3>{history.length ? history.map((entry) => <p className={styles.timelineItem} key={entry.history_id}><strong>{entry.action}</strong><span>{entry.details}</span></p>) : <p>No history recorded.</p>}</section>
          <section><h3>Conversation</h3>{comments.length ? comments.map((comment) => <article className={`${styles.comment} ${comment.is_internal ? styles.internalComment : ""}`} key={comment.comment_id}><strong>{comment.is_internal ? "Internal" : "Requester"}</strong><p>{comment.body}</p></article>) : <p>No conversation recorded.</p>}</section>
          <div className={styles.assignFields}>
            <label>Team<select value={assignTeam} onChange={(event) => setAssignTeam(event.target.value)}><option value="">Unassigned team</option>{teams.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}</select></label>
            <label>Agent<select value={assignUser} onChange={(event) => setAssignUser(event.target.value)}><option value="">Unassigned</option>{users.filter((user) => user.role === "Agent" && (!assignTeam || user.team_id === assignTeam)).map((user) => <option key={user.user_id} value={user.user_id}>{user.name}</option>)}</select></label>
          </div>
        </div>}
      </Drawer>

      <ConfirmDialog open={mergeOpen} title="Merge duplicate tickets" description={`Merge ${selected.slice(1).join(", ")} into primary ticket ${selected[0]}?`} confirmLabel="Merge tickets" onCancel={() => setMergeOpen(false)} onConfirm={() => void confirmMerge()} />
      <ConfirmDialog open={assignOpen} title="Assign ticket" description="Update the team and agent assigned to this ticket." confirmLabel="Assign" onCancel={() => setAssignOpen(false)} onConfirm={() => void confirmAssign()} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <noscript><Link href="/supervisor-khus/dashboard">Back to dashboard</Link></noscript>
    </div>
  );
}

export default function SupervisorTicketsPage() {
  return <Suspense fallback={<Skeleton label="Loading supervisor tickets" rows={8} />}><TicketsContent /></Suspense>;
}
