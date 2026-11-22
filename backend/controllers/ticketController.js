const db = require('../config/db');
const { istDateKey } = require('../utils/businessTime');
const { derivePriority, isValidPriority } = require('../utils/priority');
const { computeDueDates, computeSlaStatus } = require('../utils/sla');
const { getSlaPolicy, loadBusinessCalendar, calendarFor } = require('../services/slaService');
const { autoAssign } = require('../services/assignmentService');
const { addHistory, notifyRole, getSystemUserId } = require('../services/auditService');

// Shared SELECT for the list and the detail view (the SLA columns are used to work out sla_status).
const TICKET_SELECT = `
    SELECT T.ticket_id, T.ticket_no, T.subject, T.description, T.status, T.priority, T.channel,
           T.requester_id, U.name AS requester_name,
           T.assignee_id, A.name AS assignee_name,
           T.team_id, TM.team_name, T.category_id, C.name AS category_name,
           T.created_at, T.first_response_at, T.resolved_at, T.closed_at,
           T.response_due, T.resolution_due, T.hold_started_at, T.is_breached, T.escalated_at,
           S.response_mins, S.resolution_mins, S.is_24x7
    FROM TICKET T
    JOIN USER U ON T.requester_id = U.user_id
    LEFT JOIN USER A ON T.assignee_id = A.user_id
    JOIN TEAM TM ON T.team_id = TM.team_id
    JOIN CATEGORY C ON T.category_id = C.category_id
    JOIN SLA_POLICY S ON T.sla_id = S.sla_id`;

// Adds sla_status / sla_timer / sla_percent to a ticket row and hides the raw SLA policy columns.
function withSla(row, businessCalendar) {
    const sla = { response_mins: row.response_mins, resolution_mins: row.resolution_mins, is_24x7: row.is_24x7 };
    const { response_mins, resolution_mins, is_24x7, ...ticket } = row;
    return {
        ...ticket,
        is_breached: Boolean(row.is_breached),
        ...computeSlaStatus(row, sla, calendarFor(sla, businessCalendar)),
    };
}

async function safeRollback(conn) {
    try {
        await conn.rollback();
    } catch (err) {
        // the connection is already gone, nothing else to do
    }
}

// 1. Create a New Ticket (FR-08, FR-09, FR-14, FR-15, FR-22, FR-23)
exports.createTicket = async (req, res) => {
    const { subject, description, category_id, requester_id, impact, urgency, channel = 'Portal' } = req.body || {};
    let { priority = 'Medium' } = req.body || {};

    // Validate input
    if (!subject || !description || !category_id || !requester_id) {
        return res.status(400).json({ error: 'Please provide subject, description, category_id, and requester_id.' });
    }
    if (impact && urgency) {
        try {
            priority = derivePriority(impact, urgency); // FR-14: priority from impact x urgency
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    if (!isValidPriority(priority)) {
        return res.status(400).json({ error: 'priority must be Low, Medium, High or Critical.' });
    }

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        const now = new Date();
        now.setMilliseconds(0); // TIMESTAMP columns keep whole seconds

        // 1. Team comes from the category
        const [categories] = await conn.query('SELECT default_team_id FROM CATEGORY WHERE category_id = ?', [category_id]);
        if (categories.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Invalid category selected.' });
        }
        const team_id = categories[0].default_team_id;

        const [requesters] = await conn.query('SELECT user_id FROM USER WHERE user_id = ? AND is_active = 1', [requester_id]);
        if (requesters.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Requester not found or inactive.' });
        }

        // 2. SLA policy + due dates (business hours only; Critical runs 24x7)
        const sla = await getSlaPolicy(conn, priority);
        if (!sla) {
            await conn.rollback();
            return res.status(500).json({ error: `No SLA policy found for priority ${priority}.` });
        }
        const calendar = calendarFor(sla, await loadBusinessCalendar(conn));
        const { response_due, resolution_due } = computeDueDates(now, sla, calendar);

        // 3. Insert with a temporary number, then set the real one from the new id (no duplicates, even in parallel)
        const [result] = await conn.query(
            `INSERT INTO TICKET
                (ticket_no, subject, description, status, priority, channel, requester_id, team_id, category_id, sla_id, created_at, response_due, resolution_due)
             VALUES (?, ?, ?, 'New', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                `TMP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
                subject, description, priority, channel, requester_id, team_id, category_id, sla.sla_id,
                now, response_due, resolution_due,
            ]
        );
        const ticketId = result.insertId;
        const ticket_no = `HD-${istDateKey(now).slice(0, 4)}-${String(ticketId).padStart(6, '0')}`; // FR-09: HD-2026-000123
        await conn.query('UPDATE TICKET SET ticket_no = ? WHERE ticket_id = ?', [ticket_no, ticketId]);
        await addHistory(conn, ticketId, requester_id, 'status', null, 'New', now);

        // 4. Auto-assign: agent of that team with the fewest open tickets (FR-15)
        const systemId = await getSystemUserId(conn, requester_id);
        const assigned = await autoAssign(
            conn,
            { ticket_id: ticketId, ticket_no, status: 'New', assignee_id: null, team_id },
            systemId,
            now
        );
        if (!assigned) {
            await notifyRole(conn, 'Supervisor', ticketId, `Ticket ${ticket_no} is waiting: its team has no active agent.`, now);
        }

        await conn.commit();
        res.status(201).json({
            message: 'Ticket created successfully!',
            ticketId,
            ticket_no,
            status: assigned ? assigned.status : 'New',
            priority,
            team_id,
            assignee_id: assigned ? assigned.assignee_id : null,
            response_due,
            resolution_due,
        });
    } catch (err) {
        if (conn) await safeRollback(conn);
        console.error('Create ticket error:', err);
        res.status(500).json({ error: 'Server error while creating ticket.' });
    } finally {
        if (conn) conn.release();
    }
};

// 2. List tickets. Optional filters: status, priority, assignee_id, requester_id, team_id, q (search)
exports.getTickets = async (req, res) => {
  try {
    const { status, priority, assignee_id, requester_id, team_id, q } = req.query
    const where = []
    const params = []
    if (status) { where.push('T.status = ?'); params.push(status) }
    if (priority) { where.push('T.priority = ?'); params.push(priority) }
    if (assignee_id) { where.push('T.assignee_id = ?'); params.push(assignee_id) }
    if (requester_id) { where.push('T.requester_id = ?'); params.push(requester_id) }
    if (team_id) { where.push('T.team_id = ?'); params.push(team_id) }
    if (q) { where.push('(T.ticket_no LIKE ? OR T.subject LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }

    const [rows] = await db.query(
      `${TICKET_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY T.created_at DESC, T.ticket_id DESC`,
      params
    )
    const businessCalendar = await loadBusinessCalendar(db)
    res.json(rows.map((row) => withSla(row, businessCalendar)))
  } catch (err) {
    console.error('Fetch tickets error:', err)
    res.status(500).json({ error: 'Server error while fetching tickets.' })
  }
}

// 3. One ticket with its history (audit trail)
exports.getTicketById = async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Ticket id must be a number.' })
  }
  try {
    const [rows] = await db.query(`${TICKET_SELECT} WHERE T.ticket_id = ?`, [id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' })
    }
    const [history] = await db.query(
      `SELECT H.history_id, H.field_name, H.old_value, H.new_value, H.changed_at, U.name AS changed_by_name
       FROM TICKET_HISTORY H
       JOIN USER U ON H.changed_by = U.user_id
       WHERE H.ticket_id = ?
       ORDER BY H.history_id ASC`,
      [id]
    )
    res.json({ ...withSla(rows[0], await loadBusinessCalendar(db)), history })
  } catch (err) {
    console.error('Fetch ticket error:', err)
    res.status(500).json({ error: 'Server error while fetching the ticket.' })
  }
}

// 4. Get Tickets Assigned to the Logged-in Agent
exports.getAssignedTickets = async (req, res) => {
  try {
    const agentId = req.user.user_id

    const [tickets] = await db.query(`
      SELECT
        T.ticket_id,
        T.ticket_no,
        T.subject,
        T.description,
        T.status,
        T.priority,
        T.assignee_id,
        T.requester_id,
        U.name AS requester_name,
        TM.team_name,
        C.name AS category_name,
        T.created_at,
        T.response_due,
        T.resolution_due,
        T.is_breached
      FROM TICKET T
      JOIN USER U ON T.requester_id = U.user_id
      JOIN TEAM TM ON T.team_id = TM.team_id
      JOIN CATEGORY C ON T.category_id = C.category_id
      WHERE T.assignee_id = ?
      ORDER BY T.created_at DESC
    `, [agentId])

    return res.json(tickets)
  } catch (err) {
    console.error('Fetch assigned tickets error:', err)
    return res.status(500).json({
      error: 'Server error while fetching assigned tickets.'
    })
  }
}
