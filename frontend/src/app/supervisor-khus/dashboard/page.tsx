/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarList, EmptyState, PriorityBadge, Skeleton, SlaBadge, SlaGauge, StatCard } from "@/components/khushaan/ui";
import styles from "@/components/khushaan/console.module.css";
import { getDashboardStats, listTickets } from "@/lib/khushaan/api";
import { mockSlaPolicies, mockTeams, mockUsers } from "@/lib/khushaan/mock-data";
import { getSlaMetrics } from "@/lib/khushaan/sla";
import { strings } from "@/lib/khushaan/strings";
import type { DashboardStats, Ticket } from "@/lib/khushaan/types";

interface AttentionTicket {
  ticket: Ticket;
  percent: number;
  firstResponsePercent: number;
  remainingMinutes: number;
  state: "ok" | "warning" | "breached";
}

function policyFor(priority: Ticket["priority"]) {
  return mockSlaPolicies.find((policy) => policy.priority === priority) ?? mockSlaPolicies[1];
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m remaining";
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m remaining` : `${hours}h remaining`;
}

function formatOverdue(ticket: Ticket): string {
  const overdueMinutes = Math.max(0, Math.floor((Date.now() - new Date(ticket.resolution_due).getTime()) / 60_000));
  if (overdueMinutes < 60) return `${overdueMinutes}m overdue`;
  const hours = Math.floor(overdueMinutes / 60);
  const rest = overdueMinutes % 60;
  return rest ? `${hours}h ${rest}m overdue` : `${hours}h overdue`;
}

export default function SupervisorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [nextStats, ticketPage] = await Promise.all([
        getDashboardStats(),
        listTickets({ page: 1, page_size: 60, sort_by: "updated_at", sort_direction: "desc" }),
      ]);
      setStats(nextStats);
      setTickets(ticketPage.items);
      setLastUpdated(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const attentionTickets = useMemo<AttentionTicket[]>(() => {
    const openStatuses = new Set(["New", "Open", "In Progress", "On Hold", "Reopened"]);
    return tickets
      .filter((ticket) => openStatuses.has(ticket.status) && !ticket.merged_into)
      .map((ticket) => {
        const policy = policyFor(ticket.priority);
        const metrics = getSlaMetrics(ticket, policy);
        const state = ticket.is_breached || metrics.state === "breached" ? "breached" as const : metrics.state;
        return {
          ticket,
          percent: metrics.percent_elapsed,
          firstResponsePercent: metrics.first_response_percent_elapsed,
          remainingMinutes: metrics.remaining_business_minutes,
          state,
        };
      })
      .filter((item) => item.state === "breached" || item.state === "warning")
      .sort((left, right) => {
        if (left.state === "breached" && right.state !== "breached") return -1;
        if (right.state === "breached" && left.state !== "breached") return 1;
        return right.percent - left.percent;
      })
      .slice(0, 10);
  }, [tickets]);

  const firstResponseAtRisk = useMemo(() => {
    return tickets.filter((ticket) => {
      if (["Resolved", "Closed"].includes(ticket.status)) return false;
      const metrics = getSlaMetrics(ticket, policyFor(ticket.priority));
      return metrics.first_response_state === "warning" || metrics.first_response_state === "breached";
    }).length;
  }, [tickets]);

  if (loading) {
    return <section aria-busy="true"><Skeleton label="Loading supervisor dashboard" rows={8} /></section>;
  }

  if (error) {
    return (
      <section aria-labelledby="dashboard-error-title" className={styles.emptyState}>
        <h2 id="dashboard-error-title">{strings.common.errorTitle}</h2>
        <p>{error}</p>
        <button className={styles.buttonPrimary} onClick={() => void loadData()} type="button">{strings.common.retry}</button>
      </section>
    );
  }

  if (!stats) {
    return <EmptyState title="No dashboard data" description="Dashboard metrics are not available yet." />;
  }

  const assigneeName = (ticket: Ticket) => ticket.assignee_id
    ? mockUsers.find((user) => user.user_id === ticket.assignee_id)?.name ?? "Unassigned"
    : "Unassigned";
  const teamName = (teamId: string) => mockTeams.find((team) => team.team_id === teamId)?.team_name ?? teamId;

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.dashboardHeader}>
        <div>
          <p className={styles.pageEyebrow}>Operations overview</p>
          <h1 className={styles.pageTitle}>{strings.nav.dashboard}</h1>
        </div>
        <div className={styles.dashboardRefresh}>
          <span>{strings.common.lastUpdated}: {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</span>
          <button className={styles.buttonPrimary} onClick={() => void loadData()} type="button">{strings.common.refresh}</button>
        </div>
      </div>

      <section aria-label="Ticket summary" className={styles.metricGrid}>
        <StatCard label="Open tickets" value={stats.total_open} />
        <StatCard label="SLA breached" value={stats.breached_count} note="Resolution targets" />
        <StatCard label="At risk (75%+)" value={stats.at_risk_count} note="Resolution targets" />
        <section className={styles.metricCard}>
          <SlaGauge value={stats.sla_compliance_percent} />
          <p className={styles.metricNote}>{firstResponseAtRisk} first-response SLA needs attention</p>
        </section>
      </section>

      <section aria-label="Ticket distribution" className={styles.chartGrid}>
        <article className={styles.panel}><h2>Open tickets by status</h2><BarList items={stats.by_status.map((item) => ({ label: item.label, count: item.count, color: "blue" }))} /></article>
        <article className={styles.panel}><h2>Open tickets by priority</h2><BarList items={stats.by_priority.map((item) => ({ label: item.label, count: item.count, color: item.label === "Critical" ? "amber" : "blue" }))} /></article>
        <article className={styles.panel}><h2>Open tickets by team</h2><BarList items={stats.by_team.map((item) => ({ label: item.label, count: item.count, color: "teal" }))} /></article>
        <article className={styles.panel}><h2>Open tickets by agent</h2><BarList items={stats.by_agent.map((item) => ({ label: item.label, count: item.count }))} /></article>
      </section>

      <section aria-labelledby="attention-title" className={styles.attentionPanel}>
        <div className={styles.panelHeader}><h2 id="attention-title">Needs attention</h2><span>{attentionTickets.length} urgent</span></div>
        {attentionTickets.length ? (
          <div className={styles.tableFrame} style={{ maxWidth: "100%", overflowX: "auto" }}>
            <table className={styles.table}>
              <caption className={styles.visuallyHidden}>The ten most urgent open tickets</caption>
              <thead><tr><th scope="col">Ticket</th><th scope="col">Subject</th><th scope="col">Priority</th><th scope="col">Assignee</th><th scope="col">SLA</th><th scope="col">Time</th></tr></thead>
              <tbody>
                {attentionTickets.map(({ ticket, percent, remainingMinutes, state }) => (
                  <tr className={state === "breached" ? styles.breachedRow : undefined} key={ticket.ticket_no}>
                    <td><Link className={styles.ticketLink} href={`/supervisor-khus/tickets?q=${encodeURIComponent(ticket.ticket_no)}`}>{ticket.ticket_no}</Link></td>
                    <td><Link className={styles.ticketLink} href={`/supervisor-khus/tickets?q=${encodeURIComponent(ticket.ticket_no)}`}>{ticket.subject}</Link></td>
                    <td><PriorityBadge priority={ticket.priority} /></td>
                    <td>{assigneeName(ticket)}<span className={styles.subtleText}>{teamName(ticket.team_id)}</span></td>
                    <td><SlaBadge percent={percent} state={state} /></td>
                    <td>{state === "breached" ? formatOverdue(ticket) : formatMinutes(remainingMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No urgent tickets" description="No breached or at-risk tickets need attention." />}
      </section>
    </div>
  );
}
