import { mockTickets } from "./mockData";
import { mockKbArticles, type KnowledgeBaseArticle } from "./mockKb";
import type { DashboardStats, Ticket, TicketFeedback, TicketImpact, TicketPriority, TicketReply } from "./types";

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
const KB_RATINGS_KEY = "requester-agni-kb-ratings";
const TICKET_FEEDBACK_KEY = "requester-agni-ticket-feedback";
const REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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
    open: tickets.filter((ticket) => ticket.status === "New" || ticket.status === "Open" || ticket.status === "Reopened").length,
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

export async function reopenTicket(ticketId: string, reason: string): Promise<Ticket> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 10) throw new Error("Please provide a reason of at least 10 characters.");
  if (trimmedReason.length > 500) throw new Error("The reason must be 500 characters or fewer.");

  const ticket = getAllTickets().find((entry) => entry.id === ticketId);
  if (!ticket) throw new Error("This ticket could not be found.");
  if (ticket.status !== "Resolved") {
    if (ticket.status === "Closed" && ticket.resolvedAt && Date.now() > Date.parse(ticket.resolvedAt) + REOPEN_WINDOW_MS) {
      throw new Error("The 7-day reopen window has passed.");
    }
    throw new Error("Only resolved tickets can be reopened.");
  }

  const resolvedAt = ticket.resolvedAt ? Date.parse(ticket.resolvedAt) : Number.NaN;
  if (!Number.isFinite(resolvedAt)) throw new Error("This ticket does not have a resolution date and cannot be reopened.");
  if (Date.now() > resolvedAt + REOPEN_WINDOW_MS) throw new Error("The 7-day reopen window has passed.");

  const user = getRequesterUser();
  if (!user) throw new Error("Please sign in again before reopening this ticket.");

  const now = new Date().toISOString();
  const historyEntry = { status: "Reopened" as const, at: now, by: user.name, note: trimmedReason };
  const reply: TicketReply = {
    id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: user.name,
    role: "Requester",
    body: trimmedReason,
    createdAt: now,
    isInternal: false,
  };
  const reopenedTicket: Ticket = {
    ...ticket,
    status: "Reopened",
    updatedAt: now,
    history: [...(ticket.history ?? []), historyEntry],
    replies: [...(ticket.replies ?? []), reply],
  };
  saveTicket(reopenedTicket);
  return reopenedTicket;
}

export async function submitFeedback(ticketId: string, rating: number, comment?: string): Promise<TicketFeedback> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Choose a rating from 1 to 5 stars.");
  }
  const trimmedComment = comment?.trim();
  if (trimmedComment && trimmedComment.length > 500) {
    throw new Error("Comments must be 500 characters or fewer.");
  }

  const ticket = getAllTickets().find((entry) => entry.id === ticketId);
  if (!ticket) throw new Error("This ticket could not be found.");
  if (ticket.status !== "Resolved" && ticket.status !== "Closed") {
    throw new Error("Feedback is only available for resolved or closed tickets.");
  }

  const feedbackByTicket = readTicketFeedback();
  if (feedbackByTicket[ticketId]) throw new Error("Feedback has already been submitted for this ticket.");

  const feedback: TicketFeedback = {
    ticketId,
    rating,
    ...(trimmedComment ? { comment: trimmedComment } : {}),
    submittedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(TICKET_FEEDBACK_KEY, JSON.stringify({ ...feedbackByTicket, [ticketId]: feedback }));
  } catch {
    throw new Error("Your feedback could not be saved in this browser. Please try again.");
  }
  return feedback;
}

export function getFeedback(ticketId: string): TicketFeedback | null {
  return readTicketFeedback()[ticketId] ?? null;
}

export async function listKbArticles(): Promise<KnowledgeBaseArticle[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockKbArticles.filter((article) => article.status === "Published");
}

export async function getKbArticle(id: string): Promise<KnowledgeBaseArticle | null> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const article = mockKbArticles.find((entry) => entry.id === id);
  return article?.status === "Published" ? article : null;
}

export async function rateKbArticle(id: string, rating: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Choose a rating from 1 to 5 stars.");
  }
  if (!mockKbArticles.some((article) => article.id === id && article.status === "Published")) {
    throw new Error("This article could not be found.");
  }

  const ratings = readKbRatings();
  ratings[id] = rating;
  try {
    window.localStorage.setItem(KB_RATINGS_KEY, JSON.stringify(ratings));
  } catch {
    throw new Error("Your feedback could not be saved in this browser. Please try again.");
  }
}

export function getKbRating(id: string): number | null {
  if (!mockKbArticles.some((article) => article.id === id && article.status === "Published")) return null;
  return readKbRatings()[id] ?? null;
}

export function searchKb(query: string, limit = 3): KnowledgeBaseArticle[] {
  const stopWords = new Set(["a", "an", "and", "at", "for", "from", "help", "in", "is", "it", "my", "of", "on", "the", "to", "with"]);
  const terms = (query.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? []).filter((term) => !stopWords.has(term));
  if (!terms.length) return [];

  return mockKbArticles
    .filter((article) => article.status === "Published")
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
    .slice(0, Math.max(0, limit))
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
  const tickets = [
    ...mockTickets.map((ticket) => storedById.get(ticket.id) ?? ticket),
    ...storedTickets.filter((ticket) => !mockIds.has(ticket.id)),
  ].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
  return tickets.map(closeExpiredTicket);
}

function closeExpiredTicket(ticket: Ticket): Ticket {
  if (ticket.status !== "Resolved" || !ticket.resolvedAt) return ticket;
  const resolvedAt = Date.parse(ticket.resolvedAt);
  if (!Number.isFinite(resolvedAt) || Date.now() <= resolvedAt + REOPEN_WINDOW_MS) return ticket;

  const closedAt = new Date(resolvedAt + REOPEN_WINDOW_MS).toISOString();
  const note = "Closed automatically after 7 days";
  const history = ticket.history ?? [];
  if (history.some((entry) => entry.status === "Closed" && entry.at === closedAt && entry.note === note)) {
    return { ...ticket, status: "Closed", updatedAt: closedAt };
  }

  return {
    ...ticket,
    status: "Closed",
    updatedAt: closedAt,
    history: [...history, { status: "Closed", at: closedAt, by: "System", note }],
  };
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

function readKbRatings(): Record<string, number> {
  try {
    const stored = window.localStorage.getItem(KB_RATINGS_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (isKbRatings(parsed)) return parsed;
    console.error("Stored Knowledge Base ratings have an invalid format.");
  } catch (error) {
    console.error("Could not read stored Knowledge Base ratings.", error);
  }

  return {};
}

function readTicketFeedback(): Record<string, TicketFeedback> {
  try {
    const stored = window.localStorage.getItem(TICKET_FEEDBACK_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (isTicketFeedbackByTicket(parsed)) return parsed;
    console.error("Stored ticket feedback has an invalid format.");
  } catch (error) {
    console.error("Could not read stored ticket feedback.", error);
  }

  return {};
}

function isTicketFeedbackByTicket(value: unknown): value is Record<string, TicketFeedback> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(([ticketId, entry]) => {
    if (typeof entry !== "object" || entry === null) return false;
    const feedback = entry as Record<string, unknown>;
    return feedback.ticketId === ticketId
      && typeof feedback.rating === "number"
      && Number.isInteger(feedback.rating)
      && feedback.rating >= 1
      && feedback.rating <= 5
      && (feedback.comment === undefined || typeof feedback.comment === "string")
      && typeof feedback.submittedAt === "string";
  });
}

function isKbRatings(value: unknown): value is Record<string, number> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.values(value).every((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5);
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