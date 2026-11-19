"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Priority, SlaState, TicketStatus } from "@/lib/khushaan/types";
import { strings } from "@/lib/khushaan/strings";
import styles from "./console.module.css";

export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <article className={styles.metricCard}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
      {note && <p className={styles.metricNote}>{note}</p>}
    </article>
  );
}

const statusClass: Record<TicketStatus, string> = {
  New: styles.statusNew,
  Open: styles.statusOpen,
  "In Progress": styles.statusInProgress,
  "On Hold": styles.statusOnHold,
  Resolved: styles.statusResolved,
  Closed: styles.statusClosed,
  Reopened: styles.statusReopened,
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`${styles.badge} ${statusClass[status]}`}>{strings.status[status]}</span>;
}

const priorityClass: Record<Priority, string> = {
  Critical: styles.priorityCritical,
  High: styles.priorityHigh,
  Medium: styles.priorityMedium,
  Low: styles.priorityLow,
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`${styles.badge} ${priorityClass[priority]}`}>{strings.priority[priority]}</span>;
}

export function SlaBadge({ state, percent }: { state: SlaState; percent?: number }) {
  const stateClass = state === "breached" ? styles.slaBreached : state === "warning" ? styles.slaWarning : styles.slaOk;
  return (
    <span className={`${styles.badge} ${styles.slaBadge} ${stateClass}`}>
      <span aria-hidden="true" className={styles.slaDot} />
      {strings.sla[state]}
      {percent !== undefined && <span>{` · ${percent}%`}</span>}
    </span>
  );
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 25,
  caption = strings.components.tableCaption,
  rowClassName,
}: {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  caption?: string;
  rowClassName?: (row: T) => string | undefined;
}) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((left, right) => {
      const a = String(left[sortKey] ?? "");
      const b = String(right[sortKey] ?? "");
      return a.localeCompare(b, undefined, { numeric: true }) * (sortDirection === "asc" ? 1 : -1);
    });
  }, [rows, sortDirection, sortKey]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: keyof T) {
    setPage(1);
    if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  return (
    <div className={styles.tableFrame}>
      <table className={styles.table}>
        <caption className={styles.visuallyHidden}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} scope="col">
                {column.sortable === false ? column.header : (
                  <button
                    aria-label={`${column.header}: ${strings.common.sortAscending}`}
                    className={styles.sortButton}
                    onClick={() => toggleSort(column.key)}
                    type="button"
                  >
                    {column.header}
                    <span aria-hidden="true">{sortKey === column.key ? (sortDirection === "asc" ? " ↑" : " ↓") : " ↕"}</span>
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length ? visibleRows.map((row) => (
            <tr className={rowClassName?.(row)} key={rowKey(row)}>
              {columns.map((column) => (
                <td key={String(column.key)}>{column.render ? column.render(row) : String(row[column.key] ?? "—")}</td>
              ))}
            </tr>
          )) : (
            <tr><td className={styles.tableEmpty} colSpan={columns.length}>{strings.components.tableEmpty}</td></tr>
          )}
        </tbody>
      </table>
      <div aria-label={`${strings.common.page} ${currentPage} ${strings.common.of} ${pageCount}`} className={styles.pagination}>
        <span>{sortedRows.length} {strings.common.rows}</span>
        <div className={styles.paginationControls}>
          <button aria-label={strings.common.previous} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} type="button">‹</button>
          <span>{strings.common.page} {currentPage} {strings.common.of} {pageCount}</span>
          <button aria-label={strings.common.next} disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} type="button">›</button>
        </div>
      </div>
    </div>
  );
}

export function FilterBar({
  value,
  onChange,
  onSubmit,
  placeholder = strings.components.filterPlaceholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}) {
  return (
    <form className={styles.filterBar} onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <label className={styles.visuallyHidden} htmlFor="khushaan-filter">{strings.components.filterSearch}</label>
      <input id="khushaan-filter" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
      <button className={styles.buttonPrimary} type="submit">{strings.components.filterSearch}</button>
    </form>
  );
}

function useDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return {
    dialogRef,
    onCancel: (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
  };
}

export function ConfirmDialog({
  open,
  title = strings.components.dialogTitle,
  description = strings.components.dialogDescription,
  confirmLabel = strings.common.confirm,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { dialogRef, onCancel: handleCancel } = useDialog(open, onCancel);
  return (
    <dialog aria-labelledby="confirm-dialog-title" className={styles.modal} onCancel={handleCancel} ref={dialogRef}>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p>{description}</p>
      <div className={styles.dialogActions}>
        <button className={styles.buttonQuiet} onClick={onCancel} type="button">{strings.common.cancel}</button>
        <button className={styles.buttonPrimary} onClick={onConfirm} type="button">{confirmLabel}</button>
      </div>
    </dialog>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { dialogRef, onCancel } = useDialog(open, onClose);
  return (
    <dialog aria-labelledby="drawer-title" className={`${styles.modal} ${styles.drawer}`} onCancel={onCancel} ref={dialogRef}>
      <header className={styles.drawerHeader}>
        <h2 id="drawer-title">{title}</h2>
        <button aria-label={strings.components.drawerClose} className={styles.buttonQuiet} onClick={onClose} type="button">×</button>
      </header>
      {children}
    </dialog>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div aria-live="polite" className={styles.toast} role="status">
      <span>{message}</span>
      <button aria-label={strings.common.close} onClick={onClose} type="button">×</button>
    </div>
  );
}

export function EmptyState({ title = strings.common.emptyTitle, description = strings.common.emptyDescription }: { title?: string; description?: string }) {
  return <section className={styles.emptyState}><h2>{title}</h2><p>{description}</p></section>;
}

export function Skeleton({ rows = 4, label = strings.common.loading }: { rows?: number; label?: string }) {
  return <div aria-label={label} className={styles.skeletonGroup} role="status">{Array.from({ length: rows }, (_, index) => <span className={styles.skeleton} key={index} />)}</div>;
}

export function BarList({ items }: { items: Array<{ label: string; count: number; color?: "blue" | "teal" | "amber" }> }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (!items.length) return <p className={styles.chartEmpty}>{strings.components.chartEmpty}</p>;
  return (
    <div className={styles.barList}>
      {items.map((item) => (
        <div className={styles.barRow} key={item.label}>
          <div className={styles.barMeta}><span>{item.label}</span><strong>{item.count}</strong></div>
          <div aria-label={`${item.label}: ${item.count}`} className={styles.barTrack} role="img">
            <span className={`${styles.barFill} ${item.color ? styles[`bar${item.color[0].toUpperCase()}${item.color.slice(1)}`] : ""}`} style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SlaGauge({ value, label = strings.sla.compliance }: { value: number; label?: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 43;
  return (
    <div className={styles.gaugeWrap}>
      <svg aria-label={`${label}: ${bounded}%`} className={styles.gauge} role="img" viewBox="0 0 100 100">
        <circle className={styles.gaugeTrack} cx="50" cy="50" r="43" />
        <circle className={styles.gaugeValue} cx="50" cy="50" r="43" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - bounded / 100)} />
        <text className={styles.gaugeText} dominantBaseline="middle" textAnchor="middle" x="50" y="48">{bounded}%</text>
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  return (
    <fieldset className={styles.dateRange}>
      <legend>{strings.components.selectDateRange}</legend>
      <label>{strings.components.dateFrom}<input onChange={(event) => onChange({ from: event.target.value, to })} type="date" value={from} /></label>
      <label>{strings.components.dateTo}<input onChange={(event) => onChange({ from, to: event.target.value })} type="date" value={to} /></label>
    </fieldset>
  );
}