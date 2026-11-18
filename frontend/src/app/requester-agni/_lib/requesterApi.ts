import { mockTickets } from "./mockData";
import { mockKbArticles, type KnowledgeBaseArticle } from "./mockKb";
import type { DashboardStats, Ticket, TicketImpact, TicketPriority, TicketReply } from "./types";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult = {
  email: string;
};

export type RequesterUser = {
  name: string;
  email: string;
};

const REQUESTER_USER_KEY = "requester-agni-user";
const CREATED_TICKETS_KEY = "requester-agni-created-tickets";

export type CreateTicketData = {
  subject: string;
  description: string;
  category: string;
  subCategory: string;
  impact: TicketImpact;
  urgency: TicketImpact;
  priority: TicketPriority;
  employeeId: string;
  department: string;
  phone: string;
  location: string;
  attachments: string[];
};

export type RegisterCredentials = {
  name: string;
  email: string;
  password: string;
};

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const email = credentials.email.trim();
  const user = { name: email.split("@")[0], email };
  window.localStorage.setItem(REQUESTER_USER_KEY, JSON.stringify(user));
  return { email };
}

export async function register(credentials: RegisterCredentials): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { email: credentials.email };
}

export async function forgotPassword(email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  void email;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  void newPassword;

  if (!token.trim() || token === "expired") {
    throw new Error("This reset link has expired or is invalid");
  }
}

export function getRequesterUser(): RequesterUser | null {
  const storedUser = window.localStorage.getItem(REQUESTER_USER_KEY);
  if (!storedUser) return null;

  try {
    const user = JSON.parse(storedUser) as RequesterUser;
    if (typeof user.name === "string" && typeof user.email === "string") return user;
  } catch {
    window.localStorage.removeItem(REQUESTER_USER_KEY);
  }

  return null;
}

export function clearRequesterUser(): void {
  window.localStorage.removeItem(REQUESTER_USER_KEY);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const tickets = await getAllTickets();
  return {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "New" || ticket.status === "Open").length,
    inProgress: tickets.filter((ticket) => ticket.status === "In Progress").length,
    resolved: tickets.filter((ticket) => ticket.status === "Resolved").length,
  };
}

export async function getMyTickets(): Promise<Ticket[]> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return getAllTickets().map((ticket) => ({
    ...ticket,
    replies: (ticket.replies ?? []).filter((reply) => !reply.isInternal),
  }));
}

export async function getTicket(id: string): Promise<Ticket | null> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const ticket = getAllTickets().find((entry) => entry.id === id);
  if (!ticket) return null;

  return {
    ...ticket,
    history: ticket.history ? [...ticket.history] : [],
    replies: (ticket.replies ?? []).filter((reply) => !reply.isInternal),
  };
}

export async function addReply(ticketId: string, body: string): Promise<TicketReply> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error("Write a reply before sending.");
  if (trimmedBody.length > 1000) throw new Error("Replies must be 1000 characters or fewer.");

  const ticket = getAllTickets().find((entry) => entry.id === ticketId);
  if (!ticket) throw new Error("This ticket could not be found.");
  if (ticket.status === "Closed") throw new Error("This ticket is closed. Raise a new ticket if you need more help.");

  const user = getRequesterUser();
  if (!user) throw new Error("Please sign in again before replying.");

  const createdAt = new Date().toISOString();
  const reply: TicketReply = {
    id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: user.name,
    role: "Requester",
    body: trimmedBody,
    createdAt,
    isInternal: false,
  };

  saveTicket({
    ...ticket,
    updatedAt: createdAt,
    replies: [...(ticket.replies ?? []), reply],
  });

  return reply;
}

export function searchKb(query: string): KnowledgeBaseArticle[] {
  const stopWords = new Set(["a", "an", "and", "at", "for", "from", "help", "in", "is", "it", "my", "of", "on", "the", "to", "with"]);
  const terms = (query.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? []).filter((term) => !stopWords.has(term));
  if (!terms.length) return [];

  return mockKbArticles
    .map((article) => {
      const tokenize = (value: string): string[] => {
        const matches = value.toLocaleLowerCase().match(/[a-z0-9]+/g);
        return matches ? Array.from(matches) : [];
      };
      const title = tokenize(article.title);
      const tags = tokenize(article.tags.join(" "));
      const category = tokenize(article.category);
      const summary = tokenize(article.summary);
      const content = tokenize(article.content);
      const score = terms.reduce((total, term) => total
        + (title.includes(term) ? 4 : 0)
        + (tags.includes(term) ? 4 : 0)
        + (category.includes(term) ? 2 : 0)
        + (summary.includes(term) ? 2 : 0)
        + (content.includes(term) ? 1 : 0), 0);
      return { article, score };
    })
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3)
    .map(({ article }) => article);
}

export async function createTicket(data: CreateTicketData): Promise<Ticket> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const tickets = getAllTickets();
  const nextNumber = tickets.reduce((highest, ticket) => {
    const match = /HD-\d{4}-(\d+)$/.exec(ticket.ticketNo);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;
  const timestamp = new Date().toISOString();
  const ticket: Ticket = {
    id: `ticket-${nextNumber}`,
    ticketNo: `HD-2026-${String(nextNumber).padStart(6, "0")}`,
    subject: data.subject,
    description: data.description,
    category: data.category,
    subCategory: data.subCategory,
    status: "New",
    priority: data.priority,
    createdAt: timestamp,
    updatedAt: timestamp,
    history: [{ status: "New", at: timestamp, by: getRequesterUser()?.name ?? "Requester", note: "Ticket submitted." }],
    impact: data.impact,
    urgency: data.urgency,
    employeeId: data.employeeId,
    department: data.department,
    phone: data.phone,
    location: data.location,
    attachments: data.attachments,
  };
  const createdTickets = [...readCreatedTickets(), ticket];

  try {
    window.localStorage.setItem(CREATED_TICKETS_KEY, JSON.stringify(createdTickets));
  } catch {
    throw new Error("Your ticket could not be saved in this browser. Please try again.");
  }

  return ticket;
}

function getAllTickets(): Ticket[] {
  const storedTickets = readCreatedTickets();
  const storedById = new Map(storedTickets.map((ticket) => [ticket.id, ticket]));
  const mockIds = new Set(mockTickets.map((ticket) => ticket.id));
  return [
    ...mockTickets.map((ticket) => storedById.get(ticket.id) ?? ticket),
    ...storedTickets.filter((ticket) => !mockIds.has(ticket.id)),
  ].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

function saveTicket(ticket: Ticket): void {
  const tickets = readCreatedTickets().filter((entry) => entry.id !== ticket.id);
  try {
    window.localStorage.setItem(CREATED_TICKETS_KEY, JSON.stringify([...tickets, ticket]));
  } catch {
    throw new Error("Your reply could not be saved in this browser. Please try again.");
  }
}

function readCreatedTickets(): Ticket[] {
  try {
    const stored = window.localStorage.getItem(CREATED_TICKETS_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(isTicket)) return parsed;
    console.error("Stored requester tickets have an invalid format.");
  } catch (error) {
    console.error("Could not read stored requester tickets.", error);
  }

  return [];
}

function isTicket(value: unknown): value is Ticket {
  if (typeof value !== "object" || value === null) return false;
  const ticket = value as Record<string, unknown>;
  return typeof ticket.id === "string"
    && typeof ticket.ticketNo === "string"
    && typeof ticket.subject === "string"
    && typeof ticket.description === "string"
    && typeof ticket.category === "string"
    && typeof ticket.subCategory === "string"
    && typeof ticket.status === "string"
    && typeof ticket.priority === "string"
    && typeof ticket.createdAt === "string"
    && typeof ticket.updatedAt === "string";
}