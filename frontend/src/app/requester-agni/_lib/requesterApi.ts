import { mockTickets } from "./mockData";
import type { DashboardStats, Ticket } from "./types";

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
  return {
    total: mockTickets.length,
    open: mockTickets.filter((ticket) => ticket.status === "New" || ticket.status === "Open").length,
    inProgress: mockTickets.filter((ticket) => ticket.status === "In Progress").length,
    resolved: mockTickets.filter((ticket) => ticket.status === "Resolved").length,
  };
}

export async function getMyTickets(): Promise<Ticket[]> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return [...mockTickets].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}