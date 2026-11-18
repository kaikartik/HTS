const db = require('../config/db');
const { HttpError, sendError, withTransaction, parseId, wholeSecondsNow } = require('../utils/http');
const { checkTransition, allowedTransitions } = require('../utils/transitions');
const { loadTicket, changeStatus, assignManually } = require('../services/workflowService');
const { autoAssign } = require('../services/assignmentService');

// GET /api/tickets/:id/transitions  -> which statuses this user can move the ticket to (for the buttons)
exports.getAllowedTransitions = async (req, res) => {
    try {
        const ticketId = parseId(req.params.id);
        if (!ticketId) throw new HttpError(400, 'Ticket id must be a number.');
        const ticket = await loadTicket(db, ticketId);
        res.json({ ticket_id: ticketId, status: ticket.status, allowed: allowedTransitions(ticket, req.actor) });
    } catch (err) {
        sendError(res, err, 'Allowed transitions error');
    }
};

// PATCH /api/tickets/:id/status   body: { "status": "In Progress", "reason": "optional text" }
exports.changeStatus = async (req, res) => {
    try {
        const ticketId = parseId(req.params.id);
        const { status, reason } = req.body || {};
        if (!ticketId) throw new HttpError(400, 'Ticket id must be a number.');
        if (!status) throw new HttpError(400, 'Please send the new status in "status".');

        const result = await withTransaction(db, async (conn) => {
            const ticket = await loadTicket(conn, ticketId, { lock: true });
            const now = wholeSecondsNow();
            const check = checkTransition(ticket, status, req.actor, now);
            if (!check.ok) throw new HttpError(check.status, check.error);
            return changeStatus(conn, ticket, status, req.actor, reason, now);
        });
        res.json(result);
    } catch (err) {
        sendError(res, err, 'Change status error');
    }
};

// POST /api/tickets/:id/assign   body: { "assignee_id": 7 }   (Supervisor / Admin)
exports.assignTicket = async (req, res) => {
    try {
        const ticketId = parseId(req.params.id);
        const agentId = parseId((req.body || {}).assignee_id);
        if (!ticketId) throw new HttpError(400, 'Ticket id must be a number.');
        if (!agentId) throw new HttpError(400, 'Please send assignee_id (the agent\'s user id).');

        const result = await withTransaction(db, async (conn) => {
            const ticket = await loadTicket(conn, ticketId, { lock: true });
            return assignManually(conn, ticket, agentId, req.actor, wholeSecondsNow());
        });
        res.json({ message: 'Ticket assigned.', ticket_id: ticketId, ...result });
    } catch (err) {
        sendError(res, err, 'Assign ticket error');
    }
};

// POST /api/tickets/:id/auto-assign   (Supervisor / Admin) - for a ticket that has no agent yet
exports.autoAssignTicket = async (req, res) => {
    try {
        const ticketId = parseId(req.params.id);
        if (!ticketId) throw new HttpError(400, 'Ticket id must be a number.');

        const result = await withTransaction(db, async (conn) => {
            const ticket = await loadTicket(conn, ticketId, { lock: true });
            if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
                throw new HttpError(409, `A ${ticket.status} ticket cannot be assigned.`);
            }
            if (ticket.assignee_id) {
                throw new HttpError(409, 'The ticket already has an agent. Use /assign to change it.');
            }
            const assigned = await autoAssign(conn, ticket, req.actor.user_id, wholeSecondsNow());
            if (!assigned) throw new HttpError(409, 'No active agent is available in the ticket\'s team.');
            return assigned;
        });
        res.json({ message: 'Ticket assigned.', ticket_id: ticketId, ...result });
    } catch (err) {
        sendError(res, err, 'Auto-assign error');
    }
};