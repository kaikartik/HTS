"use client";

import { useEffect, useState } from "react";
import type { Role, User } from "./types";

const ROLE_STORAGE_KEY = "ipec-khushaan-console-role";
const supervisor = {
  user_id: "supervisor-kh",
  name: "Khushaan Irshad",
  email: "khushaan.irshad@ipec.edu",
  role: "Supervisor",
  team_id: "team-it",
  is_active: true,
  available_roles: ["Supervisor", "Admin"],
} satisfies User;

export function canAccessConsole(role: Role): boolean {
  return role === "Supervisor" || role === "Admin";
}

export function useCurrentUser(): {
  user: User;
  role: "Supervisor" | "Admin";
  setRole: (nextRole: "Supervisor" | "Admin") => void;
} {
  const [role, setRoleState] = useState<"Supervisor" | "Admin">("Supervisor");

  useEffect(() => {
    const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (storedRole === "Supervisor" || storedRole === "Admin") setRoleState(storedRole);
  }, []);

  const setRole = (nextRole: "Supervisor" | "Admin") => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    setRoleState(nextRole);
  };

  return { user: { ...supervisor, role }, role, setRole };
}