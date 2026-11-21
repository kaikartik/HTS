"use client";

// =============================================================================
// Agent Workspace – shared API client, session handling and display helpers
// (owner: Kanishka Sharma). Everything here is used only by /agent-kani/*.
// =============================================================================

import { useSyncExternalStore } from "react";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const AGENT_BASE = "/agent-kani";
export const AGENT_ROLE_ID = 2;

// ---------- types ------------------------------------------------------------

export type SessionUser = {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  team_id: number | null;
};

export type Flag = number | boolean | null;

export type QueueTicket = {
  ticket_id: number;
  ticket_no: string;
  subject: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  requester_id: number;
  team_id: number;
  requester_name: string;
  team_name: string;
  category_name: string;
  created_at: string;
  first_response_at: string | null;
  response_due: string | null;
  resolution_due: string | null;
  is_breached: Flag;
  warned_75: Flag;
  escalated_at: string | null;
};

export type TicketDetail = {
  ticket_id: number;
  ticket_no: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  channel: string;
  requester_id: number;
  assignee_id: number | null;
  team_id: number;
  category_id: number;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  response_due: string | null;
  resolution_due: string | null;
  paused_minutes: number;
  is_breached: Flag;
  warned_75: Flag;
  escalated_at: string | null;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  assignee_name: string | null;
  team_name: string;
  category_name: string;
  response_mins: number;
  resolution_mins: number;
  is_24x7: Flag;
};

export type Comment = {
  comment_id: number;
  author_id: number;
  body: string;
  is_internal: Flag;
  created_at: string;
  author_name: string;
  author_role_id: number;
};

export type Attachment = {
  attachment_id: number;
  comment_id: number | null;
  file_name: string;
  size_bytes: number;
  uploaded_at: string;
  uploaded_by_name: string;
};

export type HistoryRow = {
  history_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by_name: string;
};

export type TicketDetailResponse = {
  ticket: TicketDetail;
  comments: Comment[];
  attachments: Attachment[];
  history: HistoryRow[];
  permissions: {
    can_work: boolean;
    can_claim: boolean;
    allowed_statuses: string[];
  };
};

export type Category = { category_id: number; name: string; parent_id: number | null };

export type ArticleRow = {
  article_id: number;
  title: string;
  status: string;
  views: number;
  category_id: number;
  author_id: number;
  created_at: string;
  updated_at: string;
  category_name: string;
  author_name: string;
};

export type Article = ArticleRow & { content: string };

export type NotificationItem = {
  notification_id: number;
  ticket_id: number | null;
  message: string;
  is_read: Flag;
  created_at: string;
  ticket_no: string | null;
};

export type NotificationsResponse = {
  unread_count: number;
  items: NotificationItem[];
};

// ---------- session (sessionStorage; cleared when the tab closes) -------------

const TOKEN_KEY = "hts_agent_token";
const USER_KEY = "hts_agent_user";
const SESSION_EVENT = "hts-agent-session";

export function saveSession(token: string, user: SessionUser) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function subscribeSession(callback: () => void) {
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const readUserJson = () => sessionStorage.getItem(USER_KEY);

/** Current logged-in agent (null when logged out). Safe for SSR/hydration. */
export function useSessionUser(): SessionUser | null {
  const json = useSyncExternalStore(subscribeSession, readUserJson, () => null);
  if (!json || !getToken()) return null;
  try {
    return JSON.parse(json) as SessionUser;
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};

/** false while the page is hydrating, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Current time, refreshed every minute (0 during hydration). */
export function useNow(): number {
  return useSyncExternalStore(
    (callback) => {
      const id = setInterval(callback, 60_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0
  );
}

// ---------- API client ---------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError(
      `Cannot reach the server at ${API_URL}. Is the backend running?`,
      0
    );
  }

  if (response.status === 401 && token) {
    clearSession(); // expired / invalid token -> the layout sends the user to login
  }
  return response;
}

async function errorFrom(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status}).`;
  try {
    const data = await response.json();
    if (data?.error) message = data.error;
  } catch {
    /* keep default message */
  }
  return new ApiError(message, response.status);
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const init: RequestInit = { method: options.method || "GET" };
  if (options.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }
  const response = await request(`${API_URL}/api/agent${path}`, init);
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as T;
}

export async function loginRequest(
  email: string,
  password: string
): Promise<{ token: string; user: SessionUser }> {
  const response = await request(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

/** Downloads an attachment (needs the Authorization header, so not a plain link). */
export async function downloadAttachment(id: number, fileName: string) {
  const response = await request(`${API_URL}/api/agent/attachments/${id}/download`);
  if (!response.ok) throw await errorFrom(response);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Attachment types the browser can show in a new tab. */
export const isViewable = (fileName: string) => /\.(png|jpe?g|gif|webp|pdf|txt)$/i.test(fileName);

/** Opens an attachment in a new tab (the tab is opened first so popup blockers allow it). */
export async function viewAttachment(id: number) {
  const tab = window.open("", "_blank");
  try {
    const response = await request(`${API_URL}/api/agent/attachments/${id}/download`);
    if (!response.ok) throw await errorFrom(response);

    const url = URL.createObjectURL(await response.blob());
    if (tab) tab.location.href = url;
    else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}

export function errorMessage(err: unknown, fallback = "Something went wrong.") {
  return err instanceof Error ? err.message : fallback;
}

// ---------- display helpers ----------------------------------------------------

export const isTrue = (value: Flag | undefined) => value === true || value === 1;

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function priorityStyle(priority: string) {
  switch (priority?.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    case "low":
      return "bg-green-100 text-green-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

// All 7 SRS statuses (section 7.3)
export function statusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case "new":
    case "open":
      return "bg-blue-100 text-blue-700";
    case "in progress":
      return "bg-purple-100 text-purple-700";
    case "on hold":
      return "bg-amber-100 text-amber-800";
    case "reopened":
      return "bg-orange-100 text-orange-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    case "closed":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export const isDone = (status: string) =>
  ["resolved", "closed"].includes(status?.toLowerCase());

export type SlaState = { label: string; className: string };

/** One-line SLA summary for lists (FR-24 / FR-25). `now` comes from useNow(). */
export function slaState(
  ticket: Pick<
    QueueTicket,
    | "status"
    | "is_breached"
    | "warned_75"
    | "resolution_due"
    | "response_due"
    | "first_response_at"
  >,
  now: number
): SlaState {
  if (isDone(ticket.status)) {
    return { label: "Completed", className: "bg-slate-100 text-slate-600" };
  }
  if (isTrue(ticket.is_breached)) {
    return { label: "Breached", className: "bg-red-100 text-red-700" };
  }
  if (now && ticket.resolution_due) {
    const left = new Date(ticket.resolution_due).getTime() - now;
    if (left < 0) {
      return { label: "Overdue", className: "bg-red-100 text-red-700" };
    }
  }
  if (
    now &&
    !ticket.first_response_at &&
    ticket.response_due &&
    new Date(ticket.response_due).getTime() < now
  ) {
    return { label: "Response overdue", className: "bg-red-100 text-red-700" };
  }
  if (isTrue(ticket.warned_75)) {
    return { label: "75% warning", className: "bg-amber-100 text-amber-800" };
  }
  if (ticket.status.toLowerCase() === "on hold") {
    return { label: "Paused", className: "bg-slate-100 text-slate-600" };
  }
  if (now && ticket.resolution_due) {
    const mins = Math.round((new Date(ticket.resolution_due).getTime() - now) / 60000);
    const label =
      mins >= 1440
        ? `${Math.floor(mins / 1440)}d left`
        : mins >= 60
        ? `${Math.floor(mins / 60)}h left`
        : `${mins}m left`;
    return { label, className: "bg-green-100 text-green-700" };
  }
  return { label: "On track", className: "bg-green-100 text-green-700" };
}
