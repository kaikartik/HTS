// backend/utils/transitions.js
// The ticket life cycle (SRS section 7.3) and who may do each step. Pure code, no database.

const STATUSES = ['New', 'Open', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Reopened'];
const REOPEN_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// from -> to -> roles that may do it ('System' = the automatic jobs)
const TRANSITIONS = {
  New: { Open: ['Supervisor', 'Admin', 'System'] }, // assigned
  Open: { 'In Progress': ['Agent', 'Supervisor', 'Admin'] }, // work starts
  'In Progress': {
    'On Hold': ['Agent', 'Supervisor', 'Admin'], // waiting for the requester (SLA paused)
    Resolved: ['Agent', 'Supervisor', 'Admin'], // solution given
  },
  'On Hold': { 'In Progress': ['Agent', 'Supervisor', 'Admin', 'Requester', 'System'] }, // information received
  Resolved: {
    Closed: ['Requester', 'Supervisor', 'Admin', 'System'], // confirmed, or 7 days passed
    Reopened: ['Requester', 'Supervisor', 'Admin'], // rejected within 7 days
  },
  Reopened: { 'In Progress': ['Agent', 'Supervisor', 'Admin'] }, // work resumes
  Closed: {},
};

const no = (status, error) => ({ ok: false, status, error });

// Can `actor` ({ user_id, role_name }) move `ticket` to the status `to`?
// ticket needs: status, assignee_id, requester_id, resolved_at
// Returns { ok: true } or { ok: false, status: <http code>, error: <message> }.
function checkTransition(ticket, to, actor, now = new Date()) {
  if (!STATUSES.includes(to)) {
    return no(400, `Unknown status "${to}". Use one of: ${STATUSES.join(', ')}.`);
  }
  const roles = (TRANSITIONS[ticket.status] || {})[to];
  if (!roles) {
    const next = Object.keys(TRANSITIONS[ticket.status] || {});
    const hint = next.length > 0 ? ` Allowed next: ${next.join(', ')}.` : ' It is a final status.';
    return no(409, `A ${ticket.status} ticket cannot move to ${to}.${hint}`);
  }
  if (!roles.includes(actor.role_name)) {
    return no(403, `${actor.role_name} cannot move a ticket from ${ticket.status} to ${to}.`);
  }
  if (actor.role_name === 'Agent' && Number(ticket.assignee_id) !== Number(actor.user_id)) {
    return no(403, 'Only the agent assigned to this ticket can do this.');
  }
  if (actor.role_name === 'Requester' && Number(ticket.requester_id) !== Number(actor.user_id)) {
    return no(403, 'Only the person who raised the ticket can do this.');
  }
  if (to === 'Open' && !ticket.assignee_id) {
    return no(409, 'Assign the ticket to an agent first.');
  }
  if (to === 'Reopened' && ticket.resolved_at && now - new Date(ticket.resolved_at) > REOPEN_WINDOW_DAYS * DAY_MS) {
    return no(409, `The ${REOPEN_WINDOW_DAYS}-day reopen window has passed.`);
  }
  return { ok: true };
}

// The next statuses this actor may choose (for the buttons in the UI).
function allowedTransitions(ticket, actor, now = new Date()) {
  return Object.keys(TRANSITIONS[ticket.status] || {}).filter((to) => checkTransition(ticket, to, actor, now).ok);
}

module.exports = { STATUSES, TRANSITIONS, REOPEN_WINDOW_DAYS, checkTransition, allowedTransitions };