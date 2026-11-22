import {
  mockAuditEntries,
  mockCategories,
  mockFeedback,
  mockSlaPolicies,
  mockTeams,
  mockTickets,
  mockUsers,
} from "./mock-data";
import { getSlaMetrics } from "./sla";
import type {
  AuditEntry,
  Category,
  DashboardStats,
  DateRange,
  ReportData,
  SlaPolicy,
  Team,
  Ticket,
  TicketFilters,
  TicketPage,
  User,
} from "./types";

export const USE_MOCK = true;
const SIMULATED_DELAY_MS = 140;

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
}

function getPolicy(ticket: Ticket): SlaPolicy {
  return mockSlaPolicies.find((policy) => policy.priority === ticket.priority) ?? mockSlaPolicies[1];
}

function isWithinRange(ticket: Ticket, from?: string, to?: string): boolean {
  const created = new Date(ticket.created_at).getTime();
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  return created >= fromTime && created <= toTime;
}

// TODO: replace with fetch('/api/supervisor/dashboard')
export async function getDashboardStats(): Promise<DashboardStats> {
  await wait();
  const openTickets = mockTickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status) && !ticket.merged_into);
  const countBy = <T extends string>(labels: T[], getLabel: (ticket: Ticket) => T) =>
    labels.map((label) => ({ label, count: openTickets.filter((ticket) => getLabel(ticket) === label).length }));
  const breachedCount = openTickets.filter((ticket) => getSlaMetrics(ticket, getPolicy(ticket)).state === "breached").length;
  const atRiskCount = openTickets.filter((ticket) => getSlaMetrics(ticket, getPolicy(ticket)).state === "warning").length;
  const completed = mockTickets.filter((ticket) => ["Resolved", "Closed"].includes(ticket.status));
  const compliant = completed.filter((ticket) => !ticket.is_breached).length;

  return {
    total_open: openTickets.length,
    breached_count: breachedCount,
    at_risk_count: atRiskCount,
    sla_compliance_percent: completed.length ? Math.round((compliant / completed.length) * 100) : 100,
    by_status: countBy(["New", "Open", "In Progress", "On Hold", "Resolved", "Closed", "Reopened"], (ticket) => ticket.status),
    by_priority: countBy(["Critical", "High", "Medium", "Low"], (ticket) => ticket.priority),
    by_team: mockTeams.map((team) => ({
      label: team.team_name,
      count: openTickets.filter((ticket) => ticket.team_id === team.team_id).length,
    })),
    by_agent: mockUsers.filter((user) => user.role === "Agent").map((agent) => ({
      label: agent.name,
      count: openTickets.filter((ticket) => ticket.assignee_id === agent.user_id).length,
    })),
  };
}

// TODO: replace with fetch('/api/tickets')
export async function listTickets(filters: TicketFilters = {}): Promise<TicketPage> {
  await wait();
  const query = filters.query?.trim().toLowerCase();
  const filtered = mockTickets.filter((ticket) => {
    const matchesQuery = !query || [ticket.ticket_no, ticket.subject, ticket.description]
      .some((value) => value.toLowerCase().includes(query));
    return matchesQuery
      && (!filters.status || ticket.status === filters.status)
      && (!filters.priority || ticket.priority === filters.priority)
      && (!filters.category_id || ticket.category_id === filters.category_id)
      && (!filters.assignee_id || ticket.assignee_id === filters.assignee_id)
      && (!filters.team_id || ticket.team_id === filters.team_id)
      && isWithinRange(ticket, filters.from, filters.to);
  });
  const sortBy = filters.sort_by ?? "updated_at";
  const direction = filters.sort_direction === "asc" ? 1 : -1;
  filtered.sort((left, right) => String(left[sortBy] ?? "").localeCompare(String(right[sortBy] ?? "")) * direction);
  const pageSize = Math.max(1, filters.page_size ?? 25);
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * pageSize;
  return { items: filtered.slice(offset, offset + pageSize), total: filtered.length, page, page_size: pageSize };
}

// TODO: replace with fetch('/api/tickets/:ticketNo')
export async function getTicket(ticketNo: string): Promise<Ticket | null> {
  await wait();
  return mockTickets.find((ticket) => ticket.ticket_no === ticketNo) ?? null;
}

// TODO: replace with fetch('/api/tickets/:ticketNo/assign')
export async function assignTicket(ticketNo: string, assigneeId: string | null, teamId?: string): Promise<Ticket> {
  await wait();
  const ticket = mockTickets.find((item) => item.ticket_no === ticketNo);
  if (!ticket) throw new Error("Ticket not found");
  ticket.assignee_id = assigneeId;
  if (teamId) ticket.team_id = teamId;
  ticket.updated_at = new Date().toISOString();
  return ticket;
}

// TODO: replace with fetch('/api/tickets/:ticketNo/merge')
export async function mergeTickets(primaryTicketNo: string, duplicateTicketNos: string[]): Promise<Ticket> {
  await wait();
  const primary = mockTickets.find((ticket) => ticket.ticket_no === primaryTicketNo);
  if (!primary) throw new Error("Primary ticket not found");
  if (duplicateTicketNos.includes(primaryTicketNo)) throw new Error("A ticket cannot be merged into itself");
  const duplicates = duplicateTicketNos.map((ticketNo) => mockTickets.find((ticket) => ticket.ticket_no === ticketNo));
  if (duplicates.some((ticket) => !ticket)) throw new Error("One or more tickets could not be found");
  for (const ticket of duplicates) {
    if (ticket) {
      ticket.merged_into = primaryTicketNo;
      ticket.status = "Closed";
      ticket.updated_at = new Date().toISOString();
    }
  }
  return primary;
}

// TODO: replace with fetch('/api/users')
export async function listUsers(): Promise<User[]> {
  await wait();
  return [...mockUsers];
}

// TODO: replace with fetch('/api/users/:userId')
export async function saveUser(user: User): Promise<User> {
  await wait();
  const index = mockUsers.findIndex((item) => item.user_id === user.user_id);
  if (index < 0) mockUsers.push(user);
  else mockUsers[index] = user;
  return user;
}

// TODO: replace with fetch('/api/users/:userId/active')
export async function setUserActive(userId: string, isActive: boolean): Promise<User> {
  await wait();
  const user = mockUsers.find((item) => item.user_id === userId);
  if (!user) throw new Error("User not found");
  user.is_active = isActive;
  return user;
}

// TODO: replace with fetch('/api/teams')
export async function listTeams(): Promise<Team[]> {
  await wait();
  return [...mockTeams];
}

// TODO: replace with fetch('/api/teams/:teamId')
export async function saveTeam(team: Team): Promise<Team> {
  await wait();
  const index = mockTeams.findIndex((item) => item.team_id === team.team_id);
  if (index < 0) mockTeams.push(team);
  else mockTeams[index] = team;
  return team;
}

// TODO: replace with fetch('/api/categories')
export async function listCategories(): Promise<Category[]> {
  await wait();
  return [...mockCategories];
}

// TODO: replace with fetch('/api/categories/:categoryId')
export async function saveCategory(category: Category): Promise<Category> {
  await wait();
  const index = mockCategories.findIndex((item) => item.category_id === category.category_id);
  if (index < 0) mockCategories.push(category);
  else mockCategories[index] = category;
  return category;
}

// TODO: replace with fetch('/api/sla-policies')
export async function listSlaPolicies(): Promise<SlaPolicy[]> {
  await wait();
  return [...mockSlaPolicies];
}

// TODO: replace with fetch('/api/sla-policies/:policyId')
export async function saveSlaPolicy(policy: SlaPolicy): Promise<SlaPolicy> {
  await wait();
  const index = mockSlaPolicies.findIndex((item) => item.policy_id === policy.policy_id);
  if (index < 0) mockSlaPolicies.push(policy);
  else mockSlaPolicies[index] = policy;
  return policy;
}

// TODO: replace with fetch('/api/audit-log')
export async function listAuditEntries(): Promise<AuditEntry[]> {
  await wait();
  return [...mockAuditEntries].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// TODO: replace with fetch('/api/reports')
export async function getReport(range: DateRange): Promise<ReportData> {
  await wait();
  const tickets = mockTickets.filter((ticket) => isWithinRange(ticket, range.from, range.to));
  const responded = tickets.filter((ticket) => ticket.first_response_at);
  const resolved = tickets.filter((ticket) => ticket.resolved_at);
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const responseMinutes = responded.map((ticket) =>
    (new Date(ticket.first_response_at!).getTime() - new Date(ticket.created_at).getTime()) / 60_000,
  );
  const resolutionMinutes = resolved.map((ticket) =>
    (new Date(ticket.resolved_at!).getTime() - new Date(ticket.created_at).getTime()) / 60_000,
  );
  const ticketNumbers = new Set(tickets.map((ticket) => ticket.ticket_no));
  const ratings = mockFeedback.filter((feedback) => ticketNumbers.has(feedback.ticket_no)).map((feedback) => feedback.rating);
  const completed = tickets.filter((ticket) => ticket.resolved_at);
  const compliant = completed.filter((ticket) => !ticket.is_breached).length;
  const agentCount = mockUsers.filter((user) => user.role === "Agent").length;

  return {
    range,
    summary: {
      ticket_volume: tickets.length,
      average_response_minutes: average(responseMinutes),
      average_resolution_minutes: average(resolutionMinutes),
      sla_compliance_percent: completed.length ? Math.round((compliant / completed.length) * 100) : 100,
      average_agent_workload: agentCount ? Math.round(tickets.length / agentCount) : 0,
      average_csat: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : 0,
    },
    tickets,
  };
}