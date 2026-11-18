import type { TicketStatus } from "../_lib/types";

const statusClasses: Record<TicketStatus, string> = {
  New: "bg-[#E6EEF8] text-[#00448E]",
  Open: "bg-[#EEF2FF] text-[#3730A3]",
  "In Progress": "bg-[#FEF3C7] text-[#78350F]",
  "On Hold": "bg-[#E5E7EB] text-[#374151]",
  Resolved: "bg-[#DCFCE7] text-[#166534]",
  Closed: "bg-[#E2E8F0] text-[#334155]",
  Reopened: "bg-[#FFEDD5] text-[#9A3412]",
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>{status}</span>;
}