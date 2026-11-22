"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog, Drawer, EmptyState, PriorityBadge, Skeleton, Toast } from "@/components/khushaan/ui";
import styles from "@/components/khushaan/console.module.css";
import { assignTicket, listTickets, listTeams, listUsers } from "@/lib/khushaan/api";
import { mockSlaPolicies } from "@/lib/khushaan/mock-data";
import { getSlaMetrics } from "@/lib/khushaan/sla";
import type { Ticket, User } from "@/lib/khushaan/types";

function formatTime(ticket: Ticket, breached: boolean, remainingMinutes: number): string {
  if (breached) {
    const overdue = Math.max(0, Math.floor((Date.now() - new Date(ticket.resolution_due).getTime()) / 60_000));
    if (overdue < 60) return `${overdue}m overdue`;
    const hours = Math.floor(overdue / 60); const rest = overdue % 60;
    return rest ? `${hours}h ${rest}m overdue` : `${hours}h overdue`;
  }
  const minutes = Math.max(0, remainingMinutes);
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m remaining` : `${hours}h remaining`;
}

export default function EscalationsPage() {
  const [tab, setTab] = useState<"breached" | "risk">("breached");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Array<{ team_id: string; team_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Ticket | null>(null);
  const [teamId, setTeamId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [page, userRows, teamRows] = await Promise.all([listTickets({ page_size: 60 }), listUsers(), listTeams()]);
      setTickets(page.items); setUsers(userRows); setTeams(teamRows);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load escalations."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => tickets.map((ticket) => {
    const policy = mockSlaPolicies.find((item) => item.priority === ticket.priority) ?? mockSlaPolicies[1];
    const metrics = getSlaMetrics(ticket, policy);
    return { ticket, metrics, breached: ticket.is_breached || metrics.state === "breached" };
  }).filter(({ ticket, breached, metrics }) => !["Resolved", "Closed"].includes(ticket.status) && (tab === "breached" ? breached : !breached && metrics.state === "warning")), [tickets, tab]);

  const breachedCount = useMemo(() => tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status) && (() => { const p = mockSlaPolicies.find((i) => i.priority === ticket.priority) ?? mockSlaPolicies[1]; const m = getSlaMetrics(ticket, p); return ticket.is_breached || m.state === "breached"; })()).length, [tickets]);
  const riskCount = useMemo(() => tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status) && (() => { const p = mockSlaPolicies.find((i) => i.priority === ticket.priority) ?? mockSlaPolicies[1]; const m = getSlaMetrics(ticket, p); return !ticket.is_breached && m.state === "warning"; })()).length, [tickets]);

  const openReassign = (ticket: Ticket) => { setDrawer(ticket); setTeamId(ticket.team_id); setAgentId(ticket.assignee_id ?? ""); };
  const doReassign = async () => {
    if (!drawer) return;
    try {
      await assignTicket(drawer.ticket_no, agentId || null, teamId || undefined);
      setToast(`Ticket ${drawer.ticket_no} reassigned successfully.`); setConfirm(false); setDrawer(null); await load();
    } catch (caught) { setToast(caught instanceof Error ? caught.message : "Unable to reassign ticket."); setConfirm(false); }
  };

  const userName = (id: string | null) => users.find((user) => user.user_id === id)?.name ?? "Unassigned";
  const teamName = (id: string) => teams.find((team) => team.team_id === id)?.team_name ?? id;

  return <div className={styles.ticketPage}>
    <div><p className={styles.pageEyebrow}>SLA operations</p><h1 className={styles.pageTitle}>Escalations</h1></div>
    <div className={styles.tabs} role="tablist" aria-label="Escalation type">
      <button aria-selected={tab === "breached"} className={tab === "breached" ? styles.activeTab : ""} onClick={() => setTab("breached")} role="tab" type="button">Breached <span>{breachedCount}</span></button>
      <button aria-selected={tab === "risk"} className={tab === "risk" ? styles.activeTab : ""} onClick={() => setTab("risk")} role="tab" type="button">At risk (75%+) <span>{riskCount}</span></button>
    </div>
    {loading ? <Skeleton label="Loading escalations" rows={7} /> : error ? <section className={styles.emptyState}><h2>Something went wrong</h2><p>{error}</p><button className={styles.buttonPrimary} onClick={() => void load()} type="button">Try again</button></section> : rows.length ? <div className={styles.tableFrame} style={{ maxWidth: "100%", overflowX: "auto" }}>
      <table className={styles.table}><caption className={styles.visuallyHidden}>Escalated tickets</caption><thead><tr><th scope="col">Ticket</th><th scope="col">Subject</th><th scope="col">Priority</th><th scope="col">Time</th><th scope="col">Assignee</th><th scope="col">Team</th><th scope="col">Action</th></tr></thead>
        <tbody>{rows.map(({ ticket, metrics, breached }) => <tr className={breached ? styles.breachedRow : undefined} key={ticket.ticket_no}><td>{ticket.ticket_no}</td><td>{ticket.subject}</td><td><PriorityBadge priority={ticket.priority} /></td><td>{formatTime(ticket, breached, metrics.remaining_business_minutes)}</td><td>{userName(ticket.assignee_id)}</td><td>{teamName(ticket.team_id)}</td><td><button className={styles.buttonQuiet} onClick={() => openReassign(ticket)} type="button">Reassign</button></td></tr>)}</tbody>
      </table>
    </div> : <EmptyState title={tab === "breached" ? "No breached tickets" : "No tickets at risk"} />}

    <Drawer open={Boolean(drawer)} title={drawer ? `Reassign ${drawer.ticket_no}` : "Reassign ticket"} onClose={() => setDrawer(null)}>
      {drawer && <div className={styles.assignFields}><label>Team<select value={teamId} onChange={(event) => { setTeamId(event.target.value); setAgentId(""); }}><option value="">Unassigned team</option>{teams.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}</select></label><label>Agent<select value={agentId} onChange={(event) => setAgentId(event.target.value)}><option value="">Unassigned</option>{users.filter((user) => user.role === "Agent" && (!teamId || user.team_id === teamId)).map((user) => <option key={user.user_id} value={user.user_id}>{user.name}</option>)}</select></label><button className={styles.buttonPrimary} onClick={() => setConfirm(true)} type="button">Confirm reassignment</button></div>}
    </Drawer>
    <ConfirmDialog open={confirm} title="Reassign ticket" description={`Move ${drawer?.ticket_no ?? "ticket"} to the selected team and agent?`} confirmLabel="Reassign" onCancel={() => setConfirm(false)} onConfirm={() => void doReassign()} />
    {toast && <Toast message={toast} onClose={() => setToast(null)} />}
  </div>;
}
