import type { SlaPolicy, SlaState, Ticket } from "./types";

export interface SlaMetrics {
  percent_elapsed: number;
  state: SlaState;
  remaining_business_minutes: number;
  elapsed_business_minutes: number;
}

export interface BusinessHoursConfig {
  working_days?: number[];
  opens_at?: string;
  closes_at?: string;
}

const DEFAULT_HOURS: Required<BusinessHoursConfig> = {
  working_days: [1, 2, 3, 4, 5],
  opens_at: "09:00",
  closes_at: "18:00",
};

function parseClock(value: string): [number, number] {
  const [hours, minutes] = value.split(":").map(Number);
  return [hours, minutes];
}

function countBusinessMinutes(start: Date, end: Date, config: BusinessHoursConfig = {}): number {
  if (end <= start) return 0;
  const hours = { ...DEFAULT_HOURS, ...config };
  const [openHour, openMinute] = parseClock(hours.opens_at);
  const [closeHour, closeMinute] = parseClock(hours.closes_at);
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(end);
  lastDay.setHours(0, 0, 0, 0);
  let total = 0;

  while (cursor <= lastDay) {
    if (hours.working_days.includes(cursor.getDay())) {
      const opens = new Date(cursor);
      opens.setHours(openHour, openMinute, 0, 0);
      const closes = new Date(cursor);
      closes.setHours(closeHour, closeMinute, 0, 0);
      const overlapStart = Math.max(start.getTime(), opens.getTime());
      const overlapEnd = Math.min(end.getTime(), closes.getTime());
      total += Math.max(0, overlapEnd - overlapStart) / 60_000;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.floor(total);
}

export function getSlaMetrics(
  ticket: Ticket,
  policy: SlaPolicy,
  now: Date = new Date(),
  businessHours: BusinessHoursConfig = {},
): SlaMetrics {
  const createdAt = new Date(ticket.created_at);
  const pausedAt = ticket.sla_paused_at ? new Date(ticket.sla_paused_at) : null;
  const effectiveEnd = ticket.status === "On Hold" && pausedAt ? pausedAt : now;
  const elapsedBeforePause = policy.uses_business_hours
    ? countBusinessMinutes(createdAt, effectiveEnd, businessHours)
    : Math.max(0, (effectiveEnd.getTime() - createdAt.getTime()) / 60_000);
  const historicalPause = policy.uses_business_hours
    ? Math.min(ticket.sla_paused_minutes, elapsedBeforePause)
    : ticket.sla_paused_minutes;
  const elapsed = Math.max(0, Math.floor(elapsedBeforePause - historicalPause));
  const percent = policy.resolution_minutes > 0 ? (elapsed / policy.resolution_minutes) * 100 : 0;
  const state: SlaState = ticket.is_breached || percent >= 100
    ? "breached"
    : percent >= 75
      ? "warning"
      : "ok";

  return {
    percent_elapsed: Math.min(100, Math.round(percent)),
    state,
    remaining_business_minutes: Math.max(0, policy.resolution_minutes - elapsed),
    elapsed_business_minutes: elapsed,
  };
}

export function getRemainingBusinessMinutes(
  ticket: Ticket,
  policy: SlaPolicy,
  now: Date = new Date(),
  businessHours: BusinessHoursConfig = {},
): number {
  return getSlaMetrics(ticket, policy, now, businessHours).remaining_business_minutes;
}

export function getSlaState(ticket: Ticket, policy: SlaPolicy, now: Date = new Date()): SlaState {
  return getSlaMetrics(ticket, policy, now).state;
}