"use client";

import Link from "next/link";
import { useContext } from "react";
import { PortalIcon, RequesterUserContext, type PortalIconName } from "../../_components/PortalShell";
import { themeClasses } from "../../_lib/theme";

const quickActions: { title: string; description: string; href: string; icon: PortalIconName }[] = [
  { title: "Raise a ticket", description: "Tell us what you need help with.", href: "/requester-agni/tickets/new", icon: "plus" },
  { title: "Track my tickets", description: "See updates on your requests.", href: "/requester-agni/tickets", icon: "ticket" },
  { title: "Search the Knowledge Base", description: "Browse helpful answers and guides.", href: "/requester-agni/kb", icon: "book" },
];

export default function RequesterDashboardPage() {
  const user = useContext(RequesterUserContext);
  const firstName = user?.name.trim().split(/[\s._-]+/)[0] || "there";
  const greetingName = `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`;

  return (
    <div>
      <div className="mb-9 max-w-2xl">
        <p className="mb-2 text-sm font-medium text-[#00448E]">Requester portal</p>
        <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight text-[#0F1F33] sm:text-3xl">Hi, {greetingName}! How can we help you today?</h1>
        <p className="mt-3 text-sm leading-6 text-[#5B6B80]">Choose a task to get started.</p>
      </div>

      <section aria-label="Quick actions" className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} className="group flex min-h-48 flex-col rounded-md border border-[#D9E2EF] bg-[#FFFFFF] p-5 transition hover:-translate-y-0.5 hover:border-[#00448E]/40 hover:bg-[#E6EEF8] hover:shadow-[0_10px_28px_rgba(15,31,51,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] sm:p-6">
            <span className="mb-5 grid h-11 w-11 place-items-center rounded-md bg-[#E6EEF8] text-[#00448E] transition">
              <PortalIcon name={action.icon} className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold text-[#0F1F33]">{action.title}</span>
            <span className="mt-1.5 text-sm leading-5 text-[#5B6B80]">{action.description}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}