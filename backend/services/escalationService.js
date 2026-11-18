// backend/services/escalationService.js
// What happens when a ticket misses its SLA (FR-24, FR-25).

const { addHistory, notifyRole } = require('./auditService');

// Marks the ticket as breached, records when it was escalated and tells the supervisors.
// Returns false (and does nothing) if the ticket was already flagged.
async function flagBreach(conn, ticket, reason, actorId, at = new Date()) {
  if (Number(ticket.is_breached) === 1) return false;
  await conn.query('UPDATE TICKET SET is_breached = 1, escalated_at = COALESCE(escalated_at, ?) WHERE ticket_id = ?', [
    at,
    ticket.ticket_id,
  ]);
  await addHistory(conn, ticket.ticket_id, actorId, 'is_breached', 0, 1, at);
  await notifyRole(conn, 'Supervisor', ticket.ticket_id, `SLA breached on ticket ${ticket.ticket_no}: ${reason}.`, at);
  return true;
}

module.exports = { flagBreach };