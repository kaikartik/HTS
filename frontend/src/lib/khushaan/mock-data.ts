import type {
  AuditEntry,
  BusinessHours,
  Category,
  Comment,
  Feedback,
  Holiday,
  NotificationTemplate,
  SlaPolicy,
  SystemSettings,
  Team,
  Ticket,
  TicketHistory,
  User,
} from "./types";

const teamDefinitions = [
  { team_id: "team-it", team_name: "IT & Network" },
  { team_id: "team-electrical", team_name: "Electrical" },
  { team_id: "team-facilities", team_name: "Facilities" },
  { team_id: "team-housekeeping", team_name: "Housekeeping" },
  { team_id: "team-admin", team_name: "Administration" },
] as const;

const agentNames = [
  "Aarav Mehta",
  "Aditi Verma",
  "Arjun Singh",
  "Diya Kapoor",
  "Ishaan Gupta",
  "Kavya Rao",
  "Mira Khanna",
  "Nikhil Sharma",
  "Priya Das",
  "Rahul Bhatia",
  "Riya Joshi",
  "Samar Malhotra",
] as const;

export const mockUsers: User[] = [
  ...agentNames.map((name, index) => ({
    user_id: `agent-${String(index + 1).padStart(2, "0")}`,
    name,
    email: `${name.toLowerCase().replaceAll(" ", ".")}@ipec.edu`,
    role: "Agent" as const,
    team_id: teamDefinitions[index % teamDefinitions.length].team_id,
    is_active: index !== 10,
  })),
  {
    user_id: "supervisor-kh",
    name: "Khushaan Irshad",
    email: "khushaan.irshad@ipec.edu",
    role: "Supervisor",
    team_id: "team-it",
    is_active: true,
    available_roles: ["Supervisor", "Admin"],
  },
  {
    user_id: "admin-ipec",
    name: "IPEC IT Admin",
    email: "it.admin@ipec.edu",
    role: "Admin",
    team_id: "team-admin",
    is_active: true,
  },
  ...["Ananya Saini", "Devansh Jain", "Meera Yadav"].map((name, index) => ({
    user_id: `requester-${index + 1}`,
    name,
    email: `requester${index + 1}@ipec.edu`,
    role: "Requester" as const,
    team_id: null,
    is_active: true,
  })),
];

const agents = mockUsers.filter((user) => user.role === "Agent");

export const mockTeams: Team[] = teamDefinitions.map((team, index) => {
  const teamAgents = agents.filter((_, agentIndex) => agentIndex % teamDefinitions.length === index);
  return {
    ...team,
    lead_id: teamAgents[0]?.user_id ?? "supervisor-kh",
    agent_ids: teamAgents.map((agent) => agent.user_id),
    is_active: true,
  };
});

export const mockCategories: Category[] = [
  { category_id: "cat-network", category_name: "Network / IT", parent_category_id: null, default_team_id: "team-it", is_active: true },
  { category_id: "sub-wifi", category_name: "Wi-Fi & connectivity", parent_category_id: "cat-network", default_team_id: "team-it", is_active: true },
  { category_id: "sub-hardware", category_name: "Hardware & classroom AV", parent_category_id: "cat-network", default_team_id: "team-it", is_active: true },
  { category_id: "cat-electrical", category_name: "Electrical", parent_category_id: null, default_team_id: "team-electrical", is_active: true },
  { category_id: "sub-power", category_name: "Power & lighting", parent_category_id: "cat-electrical", default_team_id: "team-electrical", is_active: true },
  { category_id: "cat-carpentry", category_name: "Carpentry", parent_category_id: null, default_team_id: "team-facilities", is_active: true },
  { category_id: "sub-furniture", category_name: "Furniture repairs", parent_category_id: "cat-carpentry", default_team_id: "team-facilities", is_active: true },
  { category_id: "cat-plumbing", category_name: "Plumbing", parent_category_id: null, default_team_id: "team-facilities", is_active: true },
  { category_id: "sub-water", category_name: "Water & drainage", parent_category_id: "cat-plumbing", default_team_id: "team-facilities", is_active: true },
  { category_id: "cat-housekeeping", category_name: "Housekeeping", parent_category_id: null, default_team_id: "team-housekeeping", is_active: true },
  { category_id: "sub-cleaning", category_name: "Cleaning request", parent_category_id: "cat-housekeeping", default_team_id: "team-housekeeping", is_active: true },
  { category_id: "cat-admin", category_name: "Other / Admin", parent_category_id: null, default_team_id: "team-admin", is_active: true },
  { category_id: "sub-access", category_name: "Access & facilities", parent_category_id: "cat-admin", default_team_id: "team-admin", is_active: true },
];

export const mockSlaPolicies: SlaPolicy[] = [
  { policy_id: "sla-critical", priority: "Critical", response_minutes: 30, resolution_minutes: 240, uses_business_hours: false, is_active: true },
  { policy_id: "sla-high", priority: "High", response_minutes: 60, resolution_minutes: 480, uses_business_hours: true, is_active: true },
  { policy_id: "sla-medium", priority: "Medium", response_minutes: 240, resolution_minutes: 1620, uses_business_hours: true, is_active: true },
  { policy_id: "sla-low", priority: "Low", response_minutes: 480, resolution_minutes: 2700, uses_business_hours: true, is_active: true },
];

const subjectSeeds = [
  { subject: "Wi-Fi keeps disconnecting in Block C", description: "The wireless connection drops repeatedly in the east wing.", category_id: "cat-network", subcategory_id: "sub-wifi", team_id: "team-it" },
  { subject: "Projector not working in Physics Lab 2", description: "The projector powers on but does not show a signal.", category_id: "cat-network", subcategory_id: "sub-hardware", team_id: "team-it" },
  { subject: "Water leakage in Hostel B washroom", description: "Water is pooling near the washroom entrance.", category_id: "cat-plumbing", subcategory_id: "sub-water", team_id: "team-facilities" },
  { subject: "Ceiling lights flicker in Room 214", description: "Several lights flicker during afternoon classes.", category_id: "cat-electrical", subcategory_id: "sub-power", team_id: "team-electrical" },
  { subject: "Desk drawer is stuck in the library", description: "A student desk drawer cannot be opened or closed.", category_id: "cat-carpentry", subcategory_id: "sub-furniture", team_id: "team-facilities" },
  { subject: "Cleaning requested after seminar", description: "Please arrange cleaning in the seminar room after the event.", category_id: "cat-housekeeping", subcategory_id: "sub-cleaning", team_id: "team-housekeeping" },
  { subject: "Staff account cannot access portal", description: "The staff member is unable to sign in to the campus portal.", category_id: "cat-network", subcategory_id: "sub-hardware", team_id: "team-it" },
  { subject: "Duplicate access card request", description: "A replacement access card is needed for the laboratory.", category_id: "cat-admin", subcategory_id: "sub-access", team_id: "team-admin" },
  { subject: "Network printer queue is paused", description: "Jobs remain in the queue and do not reach the printer.", category_id: "cat-network", subcategory_id: "sub-hardware", team_id: "team-it" },
  { subject: "Wash basin tap needs repair", description: "The tap continues to drip after being turned off.", category_id: "cat-plumbing", subcategory_id: "sub-water", team_id: "team-facilities" },
] as const;

const statuses = ["New", "Open", "In Progress", "On Hold", "Resolved", "Closed", "Reopened"] as const;
const priorities = ["Low", "Medium", "High", "Critical"] as const;
const openStatuses = new Set(["New", "Open", "In Progress", "On Hold", "Reopened"]);
const now = Date.now();

function isoAfter(minutes: number): string {
  return new Date(now + minutes * 60_000).toISOString();
}

export const mockTickets: Ticket[] = Array.from({ length: 60 }, (_, index) => {
  const seed = subjectSeeds[index % subjectSeeds.length];
  const status = statuses[index % statuses.length];
  const priority = priorities[(index * 3 + Math.floor(index / 4)) % priorities.length];
  const policy = mockSlaPolicies.find((item) => item.priority === priority)!;
  const warning = openStatuses.has(status) && index % 8 === 0;
  const breached = openStatuses.has(status) && index % 13 === 0;
  const ratio = breached ? 1.12 : warning ? 0.82 : 0.18 + (index % 4) * 0.12;
  const elapsedMinutes = Math.round(policy.resolution_minutes * ratio);
  const createdAt = now - elapsedMinutes * 60_000;
  const paused = status === "On Hold";
  const requester = mockUsers[14 + (index % 3)];
  const assignedAgent = agents[index % agents.length];
  const ticketNo = `HD-2026-${String(123 + index).padStart(6, "0")}`;
  const completed = status === "Resolved" || status === "Closed";

  return {
    ticket_no: ticketNo,
    subject: seed.subject,
    description: seed.description,
    requester_id: requester.user_id,
    assignee_id: index % 11 === 0 ? null : assignedAgent.user_id,
    team_id: seed.team_id,
    category_id: seed.category_id,
    subcategory_id: seed.subcategory_id,
    status,
    priority,
    created_at: new Date(createdAt).toISOString(),
    updated_at: new Date(now - (index % 18) * 60 * 60_000).toISOString(),
    response_due: isoAfter(policy.response_minutes - Math.round(elapsedMinutes * 0.35)),
    resolution_due: isoAfter(policy.resolution_minutes - elapsedMinutes + (paused ? 45 : 0)),
    first_response_at: index % 6 === 0 ? null : new Date(createdAt + 18 * 60_000).toISOString(),
    resolved_at: completed ? new Date(now - (index % 16) * 60 * 60_000).toISOString() : null,
    is_breached: breached,
    sla_paused_at: paused ? new Date(now - 45 * 60_000).toISOString() : null,
    sla_paused_minutes: paused ? 45 : 0,
    merged_into: null,
  };
});

export const mockComments: Comment[] = [
  { comment_id: "comment-1", ticket_no: mockTickets[0].ticket_no, author_id: mockTickets[0].requester_id, body: "The issue is affecting the morning lecture.", is_internal: false, created_at: mockTickets[0].created_at },
  { comment_id: "comment-2", ticket_no: mockTickets[0].ticket_no, author_id: mockTickets[0].assignee_id ?? "agent-01", body: "We are checking the access point logs.", is_internal: true, created_at: mockTickets[0].updated_at },
  { comment_id: "comment-3", ticket_no: mockTickets[2].ticket_no, author_id: mockTickets[2].requester_id, body: "I have added a photo to the original request.", is_internal: false, created_at: mockTickets[2].created_at },
];

export const mockTicketHistory: TicketHistory[] = mockTickets.slice(0, 12).map((ticket, index) => ({
  history_id: `history-${index + 1}`,
  ticket_no: ticket.ticket_no,
  actor_id: ticket.assignee_id ?? "supervisor-kh",
  action: index % 2 === 0 ? "Ticket assigned" : "Status updated",
  details: index % 2 === 0 ? "Assigned to the team queue." : `Status changed to ${ticket.status}.`,
  created_at: ticket.updated_at,
}));

export const mockFeedback: Feedback[] = mockTickets
  .filter((ticket) => ticket.status === "Resolved" || ticket.status === "Closed")
  .slice(0, 12)
  .map((ticket, index) => ({
    feedback_id: `feedback-${index + 1}`,
    ticket_no: ticket.ticket_no,
    requester_id: ticket.requester_id,
    rating: 3 + (index % 3),
    comment: index % 2 === 0 ? "Resolved clearly and promptly." : null,
    created_at: ticket.resolved_at ?? ticket.updated_at,
  }));

const auditActions = ["Ticket assigned", "SLA policy updated", "User deactivated", "Category updated", "Ticket escalated"];

export const mockAuditEntries: AuditEntry[] = Array.from({ length: 20 }, (_, index) => ({
  audit_id: `audit-${String(index + 1).padStart(3, "0")}`,
  actor_id: index % 4 === 0 ? "admin-ipec" : "supervisor-kh",
  action: auditActions[index % auditActions.length],
  entity_type: index % 3 === 0 ? "Ticket" : index % 3 === 1 ? "User" : "Configuration",
  entity_id: index % 2 === 0 ? mockTickets[index].ticket_no : `record-${index + 1}`,
  details: `Audit event ${index + 1} recorded by the support console.`,
  created_at: new Date(now - index * 3 * 60 * 60_000).toISOString(),
}));

export const mockHolidays: Holiday[] = [
  { holiday_id: "holiday-1", holiday_name: "New Year's Day", holiday_date: "2026-01-01" },
  { holiday_id: "holiday-2", holiday_name: "Republic Day", holiday_date: "2026-01-26" },
  { holiday_id: "holiday-3", holiday_name: "Labour Day", holiday_date: "2026-05-01" },
  { holiday_id: "holiday-4", holiday_name: "Independence Day", holiday_date: "2026-08-15" },
  { holiday_id: "holiday-5", holiday_name: "Gandhi Jayanti", holiday_date: "2026-10-02" },
  { holiday_id: "holiday-6", holiday_name: "Diwali", holiday_date: "2026-10-24" },
  { holiday_id: "holiday-7", holiday_name: "Christmas", holiday_date: "2026-12-25" },
];

export const mockBusinessHours: BusinessHours = {
  timezone: "Asia/Kolkata",
  working_days: [1, 2, 3, 4, 5],
  opens_at: "09:00",
  closes_at: "18:00",
};

export const mockNotificationTemplates: NotificationTemplate[] = [
  { template_id: "template-1", template_name: "Ticket Created", event_key: "ticket_created", subject: "New ticket {ticket_no}", body: "Dear {requester_name},\n\nYour ticket {ticket_no} has been created successfully.\n\nStatus: {status}", is_active: true },
  { template_id: "template-2", template_name: "Ticket Updated", event_key: "ticket_updated", subject: "Update on ticket {ticket_no}", body: "Dear {requester_name},\n\nYour ticket {ticket_no} is now {status}.\n\nThank you,\nIPEC Helpdesk", is_active: true },
  { template_id: "template-3", template_name: "Ticket Resolved", event_key: "ticket_resolved", subject: "Ticket {ticket_no} resolved", body: "Dear {requester_name},\n\nTicket {ticket_no} has been resolved.\n\nThank you,\nIPEC Helpdesk", is_active: true },
];

export const mockSystemSettings: SystemSettings = {
  support_mailbox: "helpdesk@ipec.edu",
  smtp_host: "smtp.ipec.edu",
  smtp_port: 587,
  smtp_username: "helpdesk@ipec.edu",
  smtp_password_configured: true,
  ldap_host: "",
  ldap_port: 389,
  ldap_base_dn: "",
  ldap_bind_password_configured: false,
};