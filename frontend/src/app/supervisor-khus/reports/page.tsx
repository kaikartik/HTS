/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRangePicker, EmptyState, Skeleton, StatCard } from "@/components/khushaan/ui";
import styles from "@/components/khushaan/console.module.css";
import { getReport } from "@/lib/khushaan/api";
import { downloadCSV, printToPDF, toCSV } from "@/lib/khushaan/export";
import { mockCategories, mockUsers } from "@/lib/khushaan/mock-data";
import type { DateRange, ReportData } from "@/lib/khushaan/types";

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDuration(minutes: number): string {
  if (!minutes) return "0m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export default function ReportsPage() {
  const today = new Date();
  const initialFrom = new Date(today);
  initialFrom.setDate(initialFrom.getDate() - 30);
  const [range, setRange] = useState<DateRange>({ from: isoDate(initialFrom), to: isoDate(today) });
  const [draftRange, setDraftRange] = useState<DateRange>(range);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState("");

  const load = async (nextRange: DateRange) => {
    if (nextRange.from && nextRange.to && nextRange.from > nextRange.to) {
      setValidation("The start date cannot be after the end date.");
      return;
    }
    setValidation("");
    setLoading(true);
    setError(null);
    try {
      setReport(await getReport(nextRange));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(range);
  }, [range]);

  const updateRange = (next: DateRange) => {
    setDraftRange(next);
    setRange(next);
  };

  const agentBreakdown = useMemo(() => {
    if (!report) return [];
    const agents = mockUsers.filter((user) => user.role === "Agent" && user.is_active);
    return agents.map((agent) => {
      const tickets = report.tickets.filter((ticket) => ticket.assignee_id === agent.user_id);
      const completed = tickets.filter((ticket) => ticket.resolved_at);
      const compliant = completed.filter((ticket) => !ticket.is_breached).length;
      return { agent: agent.name, volume: tickets.length, resolved: completed.length, sla: completed.length ? Math.round((compliant / completed.length) * 100) : 100 };
    }).sort((left, right) => right.volume - left.volume);
  }, [report]);

  const categoryBreakdown = useMemo(() => {
    if (!report) return [];
    return mockCategories.filter((category) => category.parent_category_id === null).map((category) => {
      const tickets = report.tickets.filter((ticket) => {
        if (ticket.category_id === category.category_id) return true;
        return mockCategories.some((item) => item.category_id === ticket.category_id && item.parent_category_id === category.category_id);
      });
      return { category: category.category_name, volume: tickets.length, breached: tickets.filter((ticket) => ticket.is_breached).length };
    }).sort((left, right) => right.volume - left.volume);
  }, [report]);

  const exportCsv = () => {
    if (!report) return;
    const rows = report.tickets.map((ticket) => ({
      ticket_no: ticket.ticket_no,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      assignee: mockUsers.find((user) => user.user_id === ticket.assignee_id)?.name ?? "Unassigned",
      created_at: ticket.created_at,
    }));
    downloadCSV(`ticket-report-${range.from}-to-${range.to}.csv`, toCSV(rows, ["ticket_no", "subject", "status", "priority", "assignee", "created_at"]));
  };

  return (
    <div className={styles.reportPage}>
      <header className={styles.reportHeader}>
        <div><p className={styles.pageEyebrow}>Performance analytics</p><h1 className={styles.pageTitle}>Supervisor reports</h1></div>
        <div className={styles.reportActions}><button className={styles.buttonQuiet} onClick={exportCsv} disabled={!report} type="button">Export CSV</button><button className={styles.buttonPrimary} onClick={printToPDF} disabled={!report} type="button">Export PDF</button></div>
      </header>

      <section className={styles.reportControls} aria-label="Report date range">
        <DateRangePicker from={draftRange.from} to={draftRange.to} onChange={updateRange} />
        {validation && <p className={styles.fieldError} role="alert">{validation}</p>}
        {report && <p className={styles.reportRange}>{draftRange.from} to {draftRange.to}</p>}
      </section>

      {loading ? <Skeleton label="Loading report" rows={8} /> : error ? (
        <section className={styles.emptyState}><h2>Something went wrong</h2><p>{error}</p><button className={styles.buttonPrimary} onClick={() => void load(draftRange)} type="button">Try again</button></section>
      ) : !report ? <EmptyState /> : (
        <>
          <section aria-label="Report summary" className={styles.reportMetricGrid}>
            <StatCard label="Ticket volume" value={report.summary.ticket_volume} />
            <StatCard label="Average response time" value={formatDuration(report.summary.average_response_minutes)} />
            <StatCard label="Average resolution time" value={formatDuration(report.summary.average_resolution_minutes)} />
            <StatCard label="SLA compliance" value={`${report.summary.sla_compliance_percent}%`} />
            <StatCard label="Average agent workload" value={report.summary.average_agent_workload} />
            <StatCard label="Average CSAT" value={`${report.summary.average_csat}/5`} />
          </section>

          <section className={styles.reportBreakdowns}>
            <article className={styles.panel}><h2>By agent</h2>{agentBreakdown.length ? <div className={styles.tableFrame}><table className={styles.table}><thead><tr><th>Agent</th><th>Volume</th><th>Resolved</th><th>SLA</th></tr></thead><tbody>{agentBreakdown.map((row) => <tr key={row.agent}><td>{row.agent}</td><td>{row.volume}</td><td>{row.resolved}</td><td>{row.sla}%</td></tr>)}</tbody></table></div> : <EmptyState />}</article>
            <article className={styles.panel}><h2>By category</h2>{categoryBreakdown.length ? <div className={styles.tableFrame}><table className={styles.table}><thead><tr><th>Category</th><th>Volume</th><th>Breached</th></tr></thead><tbody>{categoryBreakdown.map((row) => <tr key={row.category}><td>{row.category}</td><td>{row.volume}</td><td>{row.breached}</td></tr>)}</tbody></table></div> : <EmptyState />}</article>
          </section>

          <section className={styles.reportTickets} aria-labelledby="report-ticket-list">
            <div className={styles.panelHeader}><h2 id="report-ticket-list">Tickets in range</h2><span>{report.tickets.length} tickets</span></div>
            {report.tickets.length ? <div className={styles.tableFrame} style={{ maxWidth: "100%", overflowX: "auto" }}><table className={styles.table}><caption className={styles.visuallyHidden}>Tickets included in report</caption><thead><tr><th>Ticket</th><th>Subject</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Created</th></tr></thead><tbody>{report.tickets.map((ticket) => <tr key={ticket.ticket_no}><td>{ticket.ticket_no}</td><td>{ticket.subject}</td><td>{ticket.status}</td><td>{ticket.priority}</td><td>{mockUsers.find((user) => user.user_id === ticket.assignee_id)?.name ?? "Unassigned"}</td><td>{new Date(ticket.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No tickets in range" />}
          </section>
        </>
      )}
    </div>
  );
}
