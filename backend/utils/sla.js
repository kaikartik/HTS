// backend/utils/sla.js
// Pure SLA maths (no database). Works with a calendar from utils/businessTime.js.

const { addBusinessMinutes, businessMinutesBetween } = require('./businessTime');

// Due times for a brand-new ticket.
function computeDueDates(createdAt, sla, calendar) {
  return {
    response_due: addBusinessMinutes(createdAt, sla.response_mins, calendar),
    resolution_due: addBusinessMinutes(createdAt, sla.resolution_mins, calendar),
  };
}

// Where a ticket stands against its SLA right now.
//   ticket: { status, is_breached, first_response_at, response_due, resolution_due, hold_started_at }
//   sla:    { response_mins, resolution_mins }
// Returns { sla_status, sla_timer, sla_percent }
//   sla_status: 'ok' | 'warning' (75% used) | 'breached' | 'paused' (On Hold) | 'met' (finished in time)
//   sla_timer:  'response' (no first response yet) or 'resolution'
function computeSlaStatus(ticket, sla, calendar, now = new Date()) {
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    return { sla_status: ticket.is_breached ? 'breached' : 'met', sla_timer: null, sla_percent: null };
  }

  const waitingForResponse = !ticket.first_response_at;
  const timer = waitingForResponse ? 'response' : 'resolution';
  const totalMins = waitingForResponse ? sla.response_mins : sla.resolution_mins;
  const due = new Date(waitingForResponse ? ticket.response_due : ticket.resolution_due);

  if (ticket.is_breached) return { sla_status: 'breached', sla_timer: timer, sla_percent: 100 };

  const onHold = Boolean(ticket.hold_started_at);
  const clock = onHold ? new Date(ticket.hold_started_at) : new Date(now); // the clock stands still while On Hold
  const remaining = businessMinutesBetween(clock, due, calendar);
  const used = totalMins > 0 ? Math.min(1, Math.max(0, 1 - remaining / totalMins)) : 1;
  const percent = Math.round(used * 100);

  if (onHold) return { sla_status: 'paused', sla_timer: timer, sla_percent: percent };
  if (clock >= due) return { sla_status: 'breached', sla_timer: timer, sla_percent: 100 };
  return { sla_status: used >= 0.75 - 1e-9 ? 'warning' : 'ok', sla_timer: timer, sla_percent: percent };
}

module.exports = { computeDueDates, computeSlaStatus };