import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/khushaan/ConsoleShell";

export default function SupervisorLayout({ children }: { children: ReactNode }) {
  return <ConsoleShell area="supervisor">{children}</ConsoleShell>;
}