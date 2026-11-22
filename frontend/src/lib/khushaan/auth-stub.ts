"use client";

import { useSyncExternalStore } from "react";
import type { Role, User } from "./types";

// TEMPORARY DEVELOPMENT STUB: replace with the authenticated session and role provider.
const ROLE_STORAGE_KEY = "ipec-khushaan-console-role";
const ROLE_CHANGE_EVENT = "ipec-khushaan-role-change";
const supervisor = {
  user_id: "supervisor-kh",
  name: "Khushaan Irshad",
  email: "khushaan.irshad@ipec.edu",
  role: "Supervisor",
  team_id: "team-it",
  is_active: true,
  available_roles: ["Supervisor", "Admin"],
} satisfies User;

function getStoredRole(): "Supervisor" | "Admin" {
  if (typeof window === "undefined") return "Supervisor";
  return window.localStorage.getItem(ROLE_STORAGE_KEY) === "Admin" ? "Admin" : "Supervisor";
}

function getServerRole(): "Supervisor" | "Admin" {
  return "Supervisor";
}

function subscribeToRole(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(ROLE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ROLE_CHANGE_EVENT, onChange);
  };
}

export function canAccessConsole(role: Role): boolean {
  return role === "Supervisor" || role === "Admin";
}

export function canAccessAdmin(role: "Supervisor" | "Admin"): boolean {
  return role === "Admin";
}

export function useCurrentUser(): {
  user: User;
  role: "Supervisor" | "Admin";
  setRole: (nextRole: "Supervisor" | "Admin") => void;
} {
  const role = useSyncExternalStore(subscribeToRole, getStoredRole, getServerRole);

  const setRole = (nextRole: "Supervisor" | "Admin") => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
  };

  return { user: { ...supervisor, role }, role, setRole };
}