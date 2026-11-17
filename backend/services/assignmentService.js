// backend/services/assignmentService.js
// Auto-assignment (FR-15): the ticket already has its team (from the category); now pick the agent
// of that team with the fewest open tickets. If several are tied, the one assigned longest ago wins.

const { addHistory, notify } = require('./auditService');

// A ticket counts towards an agent's workload until it is Resolved or Closed.
const OPEN_STATUSES = ['New', 'Open', 'In Progress', 'On Hold', 'Reopened'];

// Pure: choose from [{ user_id, open_count, last_assigned_at }]. Returns null for an empty list.
function chooseAgent(candidates) {
  if (!candidates || candidates.length === 0) return null;
  const assignedAt = (agent) => (agent.last_assigned_at ? new Date(agent.last_assigned_at).getTime() : 0);
  return [...candidates].sort(
    (a, b) => Number(a.open_count) - Number(b.open_count) || assignedAt(a) - assignedAt(b) || a.user_id - b.user_id
  )[0];
}

// Active agents of a team, each with their number of open tickets.
async function findAgentCandidates(conn, teamId) {
  const marks = OPEN_STATUSES.map(() => '?').join(', ');
  const [rows] = await conn.query(
    `SELECT u.user_id, u.name, u.last_assigned_at,
            (SELECT COUNT(*) FROM TICKET t WHERE t.assignee_id = u.user_id AND t.status IN (${marks})) AS open_count
     FROM USER u
     JOIN ROLE r ON r.role_id = u.role_id
     WHERE r.role_name = 'Agent' AND u.is_active = 1 AND u.team_id = ?`,
    [...OPEN_STATUSES, teamId]
  );
  return rows;
}

// Give the ticket to an agent. A brand-new ticket moves New -> Open ("assigned" in the SRS state diagram).
async function assignTicketToAgent(conn, ticket, agentId, actorId, at = new Date()) {
  const newStatus = ticket.status === 'New' ? 'Open' : ticket.status;
  await conn.query('UPDATE TICKET SET assignee_id = ?, status = ? WHERE ticket_id = ?', [agentId, newStatus, ticket.ticket_id]);
  await conn.query('UPDATE USER SET last_assigned_at = ? WHERE user_id = ?', [at, agentId]);
  await addHistory(conn, ticket.ticket_id, actorId, 'assignee_id', ticket.assignee_id, agentId, at);
  if (newStatus !== ticket.status) {
    await addHistory(conn, ticket.ticket_id, actorId, 'status', ticket.status, newStatus, at);
  }
  await notify(conn, agentId, ticket.ticket_id, `Ticket ${ticket.ticket_no} has been assigned to you.`, at);
  return { assignee_id: agentId, status: newStatus };
}

// Pick the best agent of the ticket's team and assign. Returns null when the team has no active agent.
async function autoAssign(conn, ticket, actorId, at = new Date()) {
  const agent = chooseAgent(await findAgentCandidates(conn, ticket.team_id));
  if (!agent) return null;
  return assignTicketToAgent(conn, ticket, agent.user_id, actorId, at);
}

module.exports = { OPEN_STATUSES, chooseAgent, findAgentCandidates, assignTicketToAgent, autoAssign };