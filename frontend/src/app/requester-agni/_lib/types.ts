export type TicketStatus = "New" | "Open" | "In Progress" | "On Hold" | "Resolved" | "Closed" | "Reopened";

export type TicketPriority = "Low" | "Medium" | "High" | "Critical";
export type TicketImpact = "Low" | "Medium" | "High";

export interface TicketHistoryEntry {
  status: TicketStatus;
  at: string;
  by: string;
  note?: string;
}

export interface TicketReply {
  id: string;
  author: string;
  role: "Requester" | "Agent";
  body: string;
  createdAt: string;
  isInternal: boolean;
}

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
  impact?: TicketImpact;
  urgency?: TicketImpact;
  employeeId?: string;
  department?: string;
  phone?: string;
  location?: string;
  attachments?: string[];
  history?: TicketHistoryEntry[];
  replies?: TicketReply[];
}

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}