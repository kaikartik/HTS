// backend/services/auditService.js
// Ticket history (audit trail), in-app notifications and the "System" user.
// Every function takes a database connection first, so it can run inside a transaction.

// History values are stored as text, so numbers and dates are converted the same way every time.
function asText(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

async function addHistory(conn, ticketId, changedBy, field, oldValue, newValue, at = new Date()) {
  await conn.query(
    'INSERT INTO TICKET_HISTORY (ticket_id, changed_by, field_name, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?, ?)',
    [ticketId, changedBy, field, asText(oldValue), asText(newValue), at]
  );
}

async function notify(conn, userId, ticketId, message, at = new Date()) {
  await conn.query(
    'INSERT INTO NOTIFICATIONS (user_id, ticket_id, message, created_at) VALUES (?, ?, ?, ?)',
    [userId, ticketId, message, at]
  );
}

// Notify every active user with this role (e.g. 'Supervisor').
async function notifyRole(conn, roleName, ticketId, message, at = new Date()) {
  const [users] = await conn.query(
    'SELECT u.user_id FROM USER u JOIN ROLE r ON r.role_id = u.role_id WHERE r.role_name = ? AND u.is_active = 1',
    [roleName]
  );
  for (const user of users) await notify(conn, user.user_id, ticketId, message, at);
}

// Automatic changes (auto-assign, SLA job) are logged as the "System" user from the seed script.
async function getSystemUserId(conn, fallbackId) {
  const [rows] = await conn.query("SELECT user_id FROM USER WHERE email = 'system@helpdesk.local' LIMIT 1");
  return rows.length > 0 ? rows[0].user_id : fallbackId;
}

module.exports = { addHistory, notify, notifyRole, getSystemUserId };