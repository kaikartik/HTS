export type Role = "Requester" | "Agent" | "Supervisor" | "Admin";

export type TicketStatus =
  | "New"
  | "Open"
  | "In Progress"
  | "On Hold"
  | "Resolved"
  | "Closed"
  | "Reopened";

export type Priority = "Low" | "Medium" | "High" | "Critical";

export type SlaState = "ok" | "warning" | "breached";

export interface Team {
  team_id: string;
  team_name: string;
  lead_id: string;
  agent_ids: string[];
  is_active: boolean;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  team_id: string | null;
  is_active: boolean;
  available_roles?: Role[];
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  default_team_id: string | null;
  is_active: boolean;
}

export interface SlaPolicy {
  policy_id: string;
  priority: Priority;
  response_minutes: number;
  resolution_minutes: number;
  uses_business_hours: boolean;
  is_active: boolean;
}

export interface BusinessHours {
  timezone: string;
  working_days: number[];
  opens_at: string;
  closes_at: string;
}

export interface Holiday {
  holiday_id: string;
  holiday_name: string;
  holiday_date: string;
}

export interface NotificationTemplate {
  template_id: string;
  template_name: string;
  event_key: string;
  subject: string;
  body: string;
  is_active: boolean;
}

export interface SystemSettings {
  support_mailbox: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password_configured: boolean;
  ldap_host: string;
  ldap_port: number;
  ldap_base_dn: string;
  ldap_bind_password_configured: boolean;
}

export interface Ticket {
  ticket_no: string;
  subject: string;
  description: string;
  requester_id: string;
  assignee_id: string | null;
  team_id: string;
  category_id: string;
  subcategory_id: string | null;
  status: TicketStatus;
  priority: Priority;
  created_at: string;
  updated_at: string;
  response_due: string;
  resolution_due: string;
  first_response_at: string | null;
  resolved_at: string | null;
  is_breached: boolean;
  sla_paused_at: string | null;
  sla_paused_minutes: number;
  merged_into: string | null;
}

export interface Comment {
  comment_id: string;
  ticket_no: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketHistory {
  history_id: string;
  ticket_no: string;
  actor_id: string;
  action: string;
  details: string;
  created_at: string;
}

export interface Feedback {
  feedback_id: string;
  ticket_no: string;
  requester_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface AuditEntry {
  audit_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface TicketFilters {
  query?: string;
  status?: TicketStatus | "";
  priority?: Priority | "";
  category_id?: string;
  assignee_id?: string;
  team_id?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
  sort_by?: keyof Ticket;
  sort_direction?: "asc" | "desc";
}

export interface TicketPage {
  items: Ticket[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  total_open: number;
  breached_count: number;
  at_risk_count: number;
  sla_compliance_percent: number;
  by_status: Array<{ label: TicketStatus; count: number }>;
  by_priority: Array<{ label: Priority; count: number }>;
  by_team: Array<{ label: string; count: number }>;
  by_agent: Array<{ label: string; count: number }>;
}

export interface ReportSummary {
  ticket_volume: number;
  average_response_minutes: number;
  average_resolution_minutes: number;
  sla_compliance_percent: number;
  average_agent_workload: number;
  average_csat: number;
}

export interface ReportData {
  range: DateRange;
  summary: ReportSummary;
  tickets: Ticket[];
}