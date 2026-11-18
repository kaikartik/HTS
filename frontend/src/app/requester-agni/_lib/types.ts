export type TicketStatus = "New" | "Open" | "In Progress" | "On Hold" | "Resolved" | "Closed" | "Reopened";

export type TicketPriority = "Low" | "Medium" | "High" | "Critical";

export interface Ticket {
  id: string;
  ticketNo: string;
  subject: string;
  description: string;
  category: string;
  subCategory: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}