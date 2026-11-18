export type TicketStatus = "New" | "Open" | "In Progress" | "On Hold" | "Resolved" | "Closed" | "Reopened";

export type TicketPriority = "Low" | "Medium" | "High" | "Critical";
export type TicketImpact = "Low" | "Medium" | "High";

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
}

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}