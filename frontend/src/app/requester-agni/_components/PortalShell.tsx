"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useEffect, useState, type ReactNode } from "react";
import ipecLogo from "../_assets/ipec-logo.png";
import { clearRequesterUser, getRequesterUser, type RequesterUser } from "../_lib/requesterApi";
import { themeClasses } from "../_lib/theme";

export const RequesterUserContext = createContext<RequesterUser | null>(null);

export type PortalIconName = "home" | "ticket" | "book" | "plus" | "user" | "more" | "logout";

export function PortalIcon({ name, className }: { name: PortalIconName; className?: string }) {
  const iconContent = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    ticket: <><path d="M4 7V5h16v2a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4v-2a2 2 0 0 0 0-4Z" /><path d="M13 8v2m0 4v2" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H20M8 7h7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  }[name];

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {iconContent}
    </svg>
  );
}

const navigationItems: { label: string; href: string; icon: PortalIconName }[] = [
  { label: "Home", href: "/requester-agni/dashboard", icon: "home" },
  { label: "My Tickets", href: "/requester-agni/tickets", icon: "ticket" },
  { label: "Knowledge Base", href: "/requester-agni/kb", icon: "book" },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function RequesterAvatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E6EEF8] text-sm font-semibold text-[#00448E] ${className}`} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function AccountMenu({ user, onLogout, isOpen, onToggle, mobile = false }: {
  user: RequesterUser;
  onLogout: () => void;
  isOpen: boolean;
  onToggle: () => void;
  mobile?: boolean;
}) {
  return (
    <div className={`relative ${mobile ? "flex justify-center" : ""}`}>
      {mobile ? (
        <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-label="Open profile menu" className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#00448E] ${isOpen ? "text-[#00448E]" : "text-[#5B6B80]"}`}>
          <RequesterAvatar name={user.name} className="h-6 w-6 text-[10px]" />
          Profile
        </button>
      ) : (
        <button type="button" onClick={onToggle} aria-expanded={isOpen} aria-label="Open account menu" className="rounded-sm p-2 text-[#5B6B80] transition hover:bg-[#F4F7FB] hover:text-[#00448E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">
          <PortalIcon name="more" className="h-5 w-5" />
        </button>
      )}
      {isOpen && (
        <div className={`absolute z-30 w-60 rounded-md border border-[#D9E2EF] bg-[#FFFFFF] p-2 shadow-[0_12px_35px_rgba(15,31,51,0.14)] ${mobile ? "bottom-full right-0 mb-2" : "bottom-full right-0 mb-2"}`}>
          {mobile && <div className="border-b border-[#D9E2EF] px-3 py-2"><p className="truncate text-sm font-semibold text-[#0F1F33]">{user.name}</p><p className="truncate text-xs text-[#5B6B80]">{user.email}</p></div>}
          <button type="button" onClick={onLogout} className="flex min-h-10 w-full items-center gap-2 rounded-sm px-3 text-left text-sm font-medium text-[#a33c36] hover:bg-[#fbf1ef] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#a33c36]">
            <PortalIcon name="logout" className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [user, setUser] = useState<RequesterUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const savedUser = getRequesterUser();
    if (!savedUser) {
      router.replace("/requester-agni/login");
      return;
    }

    setUser(savedUser);
    setIsReady(true);
  }, [router]);

  function handleLogout() {
    clearRequesterUser();
    router.replace("/requester-agni/login");
  }

  if (!isReady || !user) {
    return <main className={`grid min-h-screen place-items-center text-sm ${themeClasses.page} ${themeClasses.mutedText}`}>Loading your portal...</main>;
  }

  return (
    <RequesterUserContext.Provider value={user}>
      <div className={`min-h-screen md:flex ${themeClasses.page}`}>
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#D9E2EF] bg-[#FFFFFF] px-5 py-6 md:flex">
          <Link href="/requester-agni/dashboard" className="mb-9 inline-flex items-center gap-3 rounded-sm px-2 text-sm font-semibold tracking-[0.02em] text-[#0F1F33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">
            <Image src={ipecLogo} alt="IPEC logo" width={36} height={36} className="h-9 w-9 rounded-full object-contain" priority />
            IPEC Helpdesk
          </Link>
          <nav aria-label="Requester navigation" className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] ${isActive ? themeClasses.activeNavigation : "text-[#5B6B80] hover:bg-[#F4F7FB] hover:text-[#00448E]"}`}>
                  <PortalIcon name={item.icon} className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link href="/requester-agni/tickets/new" className={`mt-7 flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${themeClasses.primaryButton} ${themeClasses.focusOutline}`}>
            <PortalIcon name="plus" className="h-[18px] w-[18px]" />
            Submit new ticket
          </Link>

          <div className="mt-auto border-t border-[#D9E2EF] pt-4">
            <div className="flex items-center gap-3 rounded-md px-2 py-2">
              <RequesterAvatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#0F1F33]">{user.name}</p>
                <p className="truncate text-xs text-[#5B6B80]">{user.email}</p>
              </div>
              <AccountMenu user={user} onLogout={handleLogout} isOpen={isProfileMenuOpen} onToggle={() => setIsProfileMenuOpen((open) => !open)} />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center border-b border-[#D9E2EF] bg-[#FFFFFF] px-5 md:hidden">
            <Link href="/requester-agni/dashboard" className="inline-flex items-center gap-2.5 rounded-sm text-sm font-semibold text-[#0F1F33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">
              <Image src={ipecLogo} alt="IPEC logo" width={32} height={32} className="h-8 w-8 rounded-full object-contain" priority />
              IPEC Helpdesk
            </Link>
          </header>
          <main className="mx-auto w-full max-w-[1240px] px-5 pb-28 pt-8 sm:px-8 md:px-10 md:pb-10 md:pt-12">
            {children}
          </main>
        </div>

        <nav aria-label="Requester navigation" className="fixed inset-x-0 bottom-0 z-20 border-t border-[#D9E2EF] bg-[#FFFFFF]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-4">
            {navigationItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#00448E] ${isActive ? "text-[#00448E]" : "text-[#5B6B80]"}`}>
                  <PortalIcon name={item.icon} className="h-[19px] w-[19px]" />
                  {item.label}
                </Link>
              );
            })}
            <AccountMenu mobile user={user} onLogout={handleLogout} isOpen={isProfileMenuOpen} onToggle={() => setIsProfileMenuOpen((open) => !open)} />
          </div>
        </nav>
      </div>
    </RequesterUserContext.Provider>
  );
}