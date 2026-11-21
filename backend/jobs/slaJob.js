// backend/jobs/slaJob.js
// Runs every minute: sends the 75% warning (FR-24), escalates breached tickets (FR-24, FR-25)
// and closes Resolved tickets after 7 days (FR-20).
// All state lives in the database (warned_75, is_breached), so nothing is lost when the server restarts.

const { computeSlaStatus } = require('../utils/sla');
const { checkTransition, REOPEN_WINDOW_DAYS } = require('../utils/transitions');
const { withTransaction, wholeSecondsNow } = require('../utils/http');
const { loadBusinessCalendar, calendarFor } = require('../services/slaService');
const { addHistory, notify, notifyRole, getSystemUserId } = require('../services/auditService');
const { flagBreach } = require('../services/escalationService');
const { loadTicket, changeStatus } = require('../services/workflowService');

const DAY_MS = 24 * 60 * 60 * 1000;

// Pure: what should happen to this ticket right now?  -> { action: 'breach' | 'warn' | null, timer }
function decideSlaAction(ticket, sla, calendar, now = new Date()) {
  if (ticket.status === 'On Hold') return { action: null, timer: null }; // the SLA clock is stopped
  const result = computeSlaStatus(ticket, sla, calendar, now);
  if (result.sla_status === 'breached' && !Number(ticket.is_breached)) return { action: 'breach', timer: result.sla_timer };
  if (result.sla_status === 'warning' && !Number(ticket.warned_75)) return { action: 'warn', timer: result.sla_timer };
  return { action: null, timer: result.sla_timer };
}

// One round of checks. `db` is the connection pool. Returns how many tickets were warned / breached / closed.
async function runSlaChecks(db, now = new Date()) {
  const summary = { checked: 0, warned: 0, breached: 0, closed: 0 };
  const systemId = await getSystemUserId(db, null);
  if (!systemId) {
    console.warn('SLA job: the System user is missing. Run  node scripts/seedDemoData.js  once.');
    return summary;
  }
  const businessCalendar = await loadBusinessCalendar(db);

  // 1. 75% warnings and breaches of tickets whose SLA clock is running
  const [tickets] = await db.query(
    `SELECT T.ticket_id, T.ticket_no, T.status, T.assignee_id, T.first_response_at, T.response_due, T.resolution_due,
            T.hold_started_at, T.is_breached, T.warned_75, S.response_mins, S.resolution_mins, S.is_24x7
     FROM TICKET T
     JOIN SLA_POLICY S ON T.sla_id = S.sla_id
     WHERE T.status IN ('New', 'Open', 'In Progress', 'Reopened') AND T.is_breached = 0`
  );
  for (const ticket of tickets) {
    summary.checked += 1;
    const sla = { response_mins: ticket.response_mins, resolution_mins: ticket.resolution_mins, is_24x7: ticket.is_24x7 };
    const { action, timer } = decideSlaAction(ticket, sla, calendarFor(sla, businessCalendar), now);
    if (!action) continue;
    try {
      await withTransaction(db, async (conn) => {
        if (action === 'breach') {
          const reason = timer === 'response' ? 'no first response before the deadline' : 'not resolved before the deadline';
          await flagBreach(conn, ticket, reason, systemId, now);
        } else {
          await conn.query('UPDATE TICKET SET warned_75 = 1 WHERE ticket_id = ?', [ticket.ticket_id]);
          await addHistory(conn, ticket.ticket_id, systemId, 'sla_warning', null, `${timer} timer reached 75%`, now);
          const text = `SLA warning: ticket ${ticket.ticket_no} has used 75% of its ${timer} time.`;
          if (ticket.assignee_id) {
            await notify(conn, ticket.assignee_id, ticket.ticket_id, text, now);
          } else {
            await notifyRole(conn, 'Supervisor', ticket.ticket_id, `${text} It has no agent yet.`, now);
          }
        }
      });
      summary[action === 'breach' ? 'breached' : 'warned'] += 1;
    } catch (err) {
      console.error(`SLA job: ticket ${ticket.ticket_no} failed:`, err.message);
    }
  }

  // 2. Resolved for 7 days and nobody reopened it -> Closed
  const cutoff = new Date(now.getTime() - REOPEN_WINDOW_DAYS * DAY_MS);
  const [resolved] = await db.query("SELECT ticket_id FROM TICKET WHERE status = 'Resolved' AND resolved_at <= ?", [cutoff]);
  const systemActor = { user_id: systemId, role_name: 'System' };
  for (const { ticket_id } of resolved) {
    try {
      const closed = await withTransaction(db, async (conn) => {
        const ticket = await loadTicket(conn, ticket_id, { lock: true });
        if (!checkTransition(ticket, 'Closed', systemActor, now).ok) return false; // changed in the meantime
        await changeStatus(conn, ticket, 'Closed', systemActor, `Closed automatically ${REOPEN_WINDOW_DAYS} days after it was resolved`, now);
        return true;
      });
      if (closed) summary.closed += 1;
    } catch (err) {
      console.error(`SLA job: auto-close of ticket ${ticket_id} failed:`, err.message);
    }
  }
  return summary;
}

// Starts the job: once straight away (to catch up after a restart), then every minute.
// For quick tests set SLA_JOB_INTERVAL_MS (for example 10000) in backend/.env.
function startSlaJob(db, intervalMs = Number(process.env.SLA_JOB_INTERVAL_MS) || 60000) {
  let running = false;
  const tick = async () => {
    if (running) return; // the previous round is still busy
    running = true;
    try {
      const s = await runSlaChecks(db, wholeSecondsNow());
      if (s.warned || s.breached || s.closed) {
        console.log(`SLA job: ${s.warned} warned, ${s.breached} breached, ${s.closed} auto-closed (${s.checked} checked)`);
      }
    } catch (err) {
      console.error('SLA job error:', err.message);
    } finally {
      running = false;
    }
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  console.log(`SLA job started: checking every ${Math.round(intervalMs / 1000)} seconds.`);
  return timer;
}

module.exports = { decideSlaAction, runSlaChecks, startSlaJob };