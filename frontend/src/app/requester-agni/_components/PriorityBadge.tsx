import type { TicketPriority } from "../_lib/types";

const priorityClasses: Record<TicketPriority, string> = {
  Low: "bg-[#E2E8F0] text-[#334155]",
  Medium: "bg-[#E6EEF8] text-[#00448E]",
  High: "bg-[#FFEDD5] text-[#9A3412]",
  Critical: "bg-[#FEE2E2] text-[#991B1B]",
};

export default function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClasses[priority]}`}>{priority}</span>;
}