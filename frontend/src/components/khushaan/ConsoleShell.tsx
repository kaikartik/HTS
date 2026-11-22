"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { mockSlaPolicies, mockTickets } from "@/lib/khushaan/mock-data";
import { canAccessAdmin, canAccessConsole, useCurrentUser } from "@/lib/khushaan/auth-stub";
import { getSlaMetrics } from "@/lib/khushaan/sla";
import { strings } from "@/lib/khushaan/strings";
import type { Role } from "@/lib/khushaan/types";
import { IpecLogo } from "./ipec-logo";
import styles from "./console.module.css";

type Area = "supervisor" | "admin";
type IconName = "dashboard" | "tickets" | "escalations" | "workload" | "reports" | "users" | "teams" | "categories" | "sla" | "hours" | "notifications" | "settings" | "audit";

const navigation: Record<Area, Array<{ label: string; path: string; icon: IconName }>> = {
  supervisor: [
    { label: strings.nav.dashboard, path: "/supervisor-khus/dashboard", icon: "dashboard" },
    { label: strings.nav.tickets, path: "/supervisor-khus/tickets", icon: "tickets" },
    { label: strings.nav.escalations, path: "/supervisor-khus/escalations", icon: "escalations" },
    { label: strings.nav.workload, path: "/supervisor-khus/workload", icon: "workload" },
    { label: strings.nav.reports, path: "/supervisor-khus/reports", icon: "reports" },
  ],
  admin: [
    { label: strings.nav.dashboard, path: "/admin-khus/dashboard", icon: "dashboard" },
    { label: strings.nav.users, path: "/admin-khus/users", icon: "users" },
    { label: strings.nav.teams, path: "/admin-khus/teams", icon: "teams" },
    { label: strings.nav.categories, path: "/admin-khus/categories", icon: "categories" },
    { label: strings.nav.slaPolicies, path: "/admin-khus/sla-policies", icon: "sla" },
    { label: strings.nav.businessHours, path: "/admin-khus/business-hours", icon: "hours" },
    { label: strings.nav.notifications, path: "/admin-khus/notifications", icon: "notifications" },
    { label: strings.nav.settings, path: "/admin-khus/settings", icon: "settings" },
    { label: strings.nav.auditLog, path: "/admin-khus/audit-log", icon: "audit" },
  ],
};

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect height="7" rx="1" width="7" x="3" y="3" /><rect height="7" rx="1" width="7" x="14" y="3" /><rect height="7" rx="1" width="7" x="3" y="14" /><rect height="7" rx="1" width="7" x="14" y="14" /></>,
    tickets: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    escalations: <><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
    workload: <><path d="M4 19V5M4 19h17" /><path d="M8 16v-5M13 16V8M18 16V5" /></>,
    reports: <><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M3 20h18" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
    teams: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20a5.5 5.5 0 0 1 11 0M15 15a4.5 4.5 0 0 1 6.5 4" /></>,
    categories: <><path d="M4 5h16M4 12h10M4 19h7" /><circle cx="19" cy="12" r="2" /><circle cx="15" cy="19" r="2" /></>,
    sla: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M8 2h8" /></>,
    hours: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></>,
    notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.8Z" transform="translate(-1 -1)" /></>,
    audit: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /><path d="m3 6 2-2" /></>,
  };
  return <svg aria-hidden="true" className={styles.navIcon} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function MenuGlyph({ close = false }: { close?: boolean }) {
  return <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">{close ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>;
}

export function ConsoleShell({ area, children }: { area: Area; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, setRole } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const policyFor = (priority: string) => mockSlaPolicies.find((item) => item.priority === priority) ?? mockSlaPolicies[1];
  const attentionCount = mockTickets.filter((ticket) =>
    !["Resolved", "Closed"].includes(ticket.status)
    && (ticket.is_breached || getSlaMetrics(ticket, policyFor(ticket.priority)).state === "warning"),
  ).length;
  const hasBothRoles = (user.available_roles?.length ?? 0) > 1;

  function submitGlobalSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("ticket-search") ?? "").trim();
    if (query) router.push(`/supervisor-khus/tickets?q=${encodeURIComponent(query)}`);
  }

  function changeRole(nextRole: Role) {
    if (nextRole !== "Supervisor" && nextRole !== "Admin") return;
    setRole(nextRole);
    router.push(nextRole === "Admin" ? "/admin-khus/dashboard" : "/supervisor-khus/dashboard");
  }

  if (!canAccessConsole(role) || (area === "admin" && !canAccessAdmin(role))) {
    return (
      <div className={styles.consoleShell}>
        <main className={styles.mainContent}>
          <section aria-labelledby="access-denied-title" className={styles.accessDenied}>
            <h1 id="access-denied-title">{strings.common.accessDeniedTitle}</h1>
            <p>{area === "admin" ? "This console is restricted to administrators." : strings.common.accessDeniedDescription}</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.consoleShell}>
      {mobileOpen && <button aria-label={strings.shell.menuClose} className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} type="button" />}
      <aside aria-label={strings.brand.name} className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}><Link aria-label={strings.brand.name} className={styles.logoLockup} href="/supervisor-khus/dashboard" onClick={() => setMobileOpen(false)}><IpecLogo /></Link></div>
        <nav aria-label={strings.shell.navigationLabel} className={styles.navGroups}>
          <section className={styles.navSection}>
            <h2 className={styles.navSectionTitle}>{strings.shell.supervisorSection}</h2>
            <ul className={styles.navList}>
              {navigation.supervisor.map((item) => (
                <li key={item.path}>
                  <Link aria-current={pathname === item.path || pathname.startsWith(`${item.path}/`) ? "page" : undefined} className={`${styles.navLink} ${pathname === item.path || pathname.startsWith(`${item.path}/`) ? styles.activeLink : ""}`} href={item.path} onClick={() => setMobileOpen(false)}>
                    <NavIcon name={item.icon} />{item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {canAccessAdmin(role) && (
            <section className={styles.navSection}>
              <h2 className={styles.navSectionTitle}>{strings.shell.adminSection}</h2>
              <ul className={styles.navList}>
                {navigation.admin.map((item) => (
                  <li key={item.path}>
                    <Link aria-current={pathname === item.path || pathname.startsWith(`${item.path}/`) ? "page" : undefined} className={`${styles.navLink} ${pathname === item.path || pathname.startsWith(`${item.path}/`) ? styles.activeLink : ""}`} href={item.path} onClick={() => setMobileOpen(false)}>
                      <NavIcon name={item.icon} />{item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </nav>
        <div className={styles.sidebarFooter}><span><i aria-hidden="true" className={styles.mockDot} />{strings.common.mockMode}</span></div>
      </aside>

      <div className={styles.mainRegion}>
        <header className={styles.topbar}>
          <button aria-label={mobileOpen ? strings.shell.menuClose : strings.shell.menuOpen} aria-expanded={mobileOpen} className={styles.menuButton} onClick={() => setMobileOpen((open) => !open)} type="button"><MenuGlyph close={mobileOpen} /></button>
          <form aria-label={strings.shell.searchLabel} className={styles.searchForm} onSubmit={submitGlobalSearch} role="search">
            <input aria-label={strings.shell.searchLabel} name="ticket-search" placeholder={strings.shell.searchPlaceholder} />
          </form>
          <div className={styles.topbarActions}>
            <div className={styles.notificationWrap}>
              <button aria-expanded={notificationsOpen} aria-label={`${strings.shell.notifications}: ${attentionCount} ${strings.shell.notificationCount}`} className={styles.iconButton} onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }} type="button">
                <NavIcon name="notifications" />
                {attentionCount > 0 && <span className={styles.alertCount}>{attentionCount > 99 ? "99+" : attentionCount}</span>}
              </button>
              {notificationsOpen && (
                <section aria-label={strings.shell.notifications} className={styles.notificationPanel}>
                  <h2>{strings.shell.notifications}</h2>
                  <p>{attentionCount ? `${attentionCount} ${strings.shell.notificationCount}` : strings.shell.noAlerts}</p>
                  <Link href="/supervisor-khus/escalations" onClick={() => setNotificationsOpen(false)}>{strings.nav.escalations}</Link>
                </section>
              )}
            </div>
            <div className={styles.profileWrap}>
              <button aria-expanded={profileOpen} aria-label={strings.shell.profileMenu} className={styles.userButton} onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }} type="button">
                <span aria-hidden="true" className={styles.userAvatar}>{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <span className={styles.userInfo}><span className={styles.userName}>{user.name}</span><span className={styles.userEmail}>{role}</span></span>
              </button>
              {profileOpen && (
                <section aria-label={strings.shell.profileMenu} className={styles.profilePanel}>
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                  {hasBothRoles && (
                    <div className={styles.roleSwitch}>
                      <label htmlFor="console-role">{strings.shell.switchRole}</label>
                      <select id="console-role" onChange={(event) => changeRole(event.target.value as Role)} value={role}>
                        <option value="Supervisor">{strings.shell.supervisorSection}</option>
                        <option value="Admin">{strings.shell.adminSection}</option>
                      </select>
                    </div>
                  )}
                  <p>{strings.shell.mockAccount}</p>
                </section>
              )}
            </div>
          </div>
        </header>
        <main className={styles.mainContent}>
          <p className={styles.breadcrumb}>{area === "supervisor" ? strings.shell.supervisorSection : strings.shell.adminSection}</p>
          {children}
        </main>
      </div>
    </div>
  );
}