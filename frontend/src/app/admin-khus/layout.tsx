import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/khushaan/ConsoleShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ConsoleShell area="admin">{children}</ConsoleShell>;
}