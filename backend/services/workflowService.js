// backend/services/workflowService.js
// Moves tickets through their life cycle (FR-18 to FR-20, FR-23) and handles manual assignment (FR-16).
// Every function takes a database connection first, so it can run inside a transaction.

const { addHistory, notify } = require('./auditService');
const { assignTicketToAgent } = require('./assignmentService');
const { loadBusinessCalendar, calendarFor } = require('./slaService');
const { flagBreach } = require('./escalationService');
const { computeDueDates, computeResumeDates } = require('../utils/sla');
const { HttpError } = require('../utils/http');

// What the requester is told after each change (skipped when the requester made the change).
const REQUESTER_MESSAGES = {
  Open: (no) => `Your ticket ${no} is now open.`,
  'In Progress': (no) => `Work has started on your ticket ${no}.`,
  'On Hold': (no) => `Your ticket ${no} is on hold. We are waiting for your reply.`,
  Resolved: (no) => `Your ticket ${no} was resolved. Please confirm, or reopen it within 7 days.`,
  Closed: (no) => `Your ticket ${no} is closed.`,
  Reopened: (no) => `Your ticket ${no} was reopened.`,
};

// The ticket plus its SLA policy. lock = true locks the row until the transaction ends.
async function loadTicket(conn, ticketId, { lock = false } = {}) {
  const [rows] = await conn.query(
    `SELECT T.*, S.response_mins, S.resolution_mins, S.is_24x7
     FROM TICKET T
     JOIN SLA_POLICY S ON T.sla_id = S.sla_id
     WHERE T.ticket_id = ?${lock ? ' FOR UPDATE' : ''}`,
    [ticketId]
  );
  if (rows.length === 0) throw new HttpError(404, 'Ticket not found.');
  return rows[0];
}

// UPDATE TICKET SET <column> = <value>, ... (the column names always come from our own code).
async function updateTicket(conn, ticketId, fields) {
  const columns = Object.keys(fields);
  await conn.query(`UPDATE TICKET SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE ticket_id = ?`, [
    ...columns.map((c) => fields[c]),
    ticketId,
  ]);
}

// Moves the ticket to a new status and applies everything that goes with it.
// The caller has already checked the move with checkTransition().
async function changeStatus(conn, ticket, to, actor, reason, now = new Date()) {
  const from = ticket.status;
  const sla = { response_mins: ticket.response_mins, resolution_mins: ticket.resolution_mins, is_24x7: ticket.is_24x7 };
  const calendar = calendarFor(sla, await loadBusinessCalendar(conn));
  const fields = { status: to };
  let lateFirstResponse = false;
  let lateResolution = false;

  if (to === 'In Progress' && !ticket.first_response_at) {
    // work starts = the first response is given
    fields.first_response_at = now;
    fields.warned_75 = 0; // the response timer is finished, so the resolution timer can send its own 75% warning
    lateFirstResponse = now > new Date(ticket.response_due);
  }
  if (from === 'On Hold') {
    // the SLA clock starts again: push the due times back by the business time spent on hold
    const resumed = computeResumeDates(ticket, calendar, now);
    Object.assign(fields, {
      hold_started_at: null,
      paused_minutes: Number(ticket.paused_minutes || 0) + Math.round(resumed.held_minutes),
      response_due: resumed.response_due,
      resolution_due: resumed.resolution_due,
    });
  }
  if (to === 'On Hold') {
    fields.hold_started_at = now; // the SLA clock stops
  }
  if (to === 'Resolved') {
    fields.resolved_at = now;
    lateResolution = now > new Date(ticket.resolution_due);
  }
  if (to === 'Closed') {
    fields.closed_at = now;
  }
  if (to === 'Reopened') {
    // reopening starts a new resolution clock
    fields.resolved_at = null;
    fields.warned_75 = 0;
    fields.resolution_due = computeDueDates(now, sla, calendar).resolution_due;
  }

  await updateTicket(conn, ticket.ticket_id, fields);
  await addHistory(conn, ticket.ticket_id, actor.user_id, 'status', from, to, now);
  if (reason) await addHistory(conn, ticket.ticket_id, actor.user_id, 'status_reason', null, reason, now);

  if (lateFirstResponse) {
    await flagBreach(conn, ticket, 'the first response came after the deadline', actor.user_id, now);
  }
  if (lateResolution) {
    await flagBreach(conn, ticket, 'the ticket was resolved after the deadline', actor.user_id, now);
  }

  const toRequester = REQUESTER_MESSAGES[to] && REQUESTER_MESSAGES[to](ticket.ticket_no);
  if (toRequester && Number(actor.user_id) !== Number(ticket.requester_id)) {
    await notify(conn, ticket.requester_id, ticket.ticket_id, toRequester, now);
  }
  if (to === 'Reopened' && ticket.assignee_id) {
    await notify(conn, ticket.assignee_id, ticket.ticket_id, `Ticket ${ticket.ticket_no} was reopened.`, now);
  }
  if (from === 'On Hold' && actor.role_name === 'Requester' && ticket.assignee_id) {
    await notify(conn, ticket.assignee_id, ticket.ticket_id, `The requester replied on ticket ${ticket.ticket_no}.`, now);
  }

  return { message: `Ticket ${ticket.ticket_no} moved from ${from} to ${to}.`, ticket_id: ticket.ticket_id, ticket_no: ticket.ticket_no, from, to };
}

// A supervisor gives the ticket to a chosen agent (assign or re-assign).
async function assignManually(conn, ticket, agentId, actor, now = new Date()) {
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    throw new HttpError(409, `A ${ticket.status} ticket cannot be assigned.`);
  }
  if (Number(ticket.assignee_id) === agentId) {
    throw new HttpError(409, 'The ticket is already assigned to this agent.');
  }
  const [agents] = await conn.query(
    `SELECT u.user_id, u.team_id
     FROM USER u
     JOIN ROLE r ON r.role_id = u.role_id
     WHERE u.user_id = ? AND r.role_name = 'Agent' AND u.is_active = 1`,
    [agentId]
  );
  if (agents.length === 0) throw new HttpError(400, 'assignee_id must be the id of an active agent.');

  const agent = agents[0];
  if (agent.team_id && Number(agent.team_id) !== Number(ticket.team_id)) {
    // the ticket moves to the new agent's team
    await updateTicket(conn, ticket.ticket_id, { team_id: agent.team_id });
    await addHistory(conn, ticket.ticket_id, actor.user_id, 'team_id', ticket.team_id, agent.team_id, now);
  }
  const previousAgent = ticket.assignee_id;
  const result = await assignTicketToAgent(conn, ticket, agentId, actor.user_id, now);
  if (previousAgent) {
    await notify(conn, previousAgent, ticket.ticket_id, `Ticket ${ticket.ticket_no} was reassigned to another agent.`, now);
  }
  return result;
}

module.exports = { loadTicket, updateTicket, changeStatus, assignManually };