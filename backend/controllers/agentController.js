// =============================================================================
// Agent Workspace controller  (owner: Kanishka Sharma)
// All routes here are mounted under /api/agent and protected by
// authenticateToken + requireAgent (see routes/agentRoutes.js).
// The agent identity ALWAYS comes from the verified JWT (req.user), never
// from the request body.
// =============================================================================
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// ---------- constants --------------------------------------------------------

// Status transitions an AGENT may perform (SRS section 7.3).
// Closing and reopening belong to the requester / system (7-day auto close),
// so they are intentionally NOT listed here.
const AGENT_TRANSITIONS = {
    'New': ['Open'],
    'Open': ['In Progress'],
    'In Progress': ['On Hold', 'Resolved'],
    'On Hold': ['In Progress'],
    'Reopened': ['In Progress'],
    'Resolved': [],
    'Closed': []
};

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const KB_STATUSES = ['Draft', 'Published'];

const UPLOAD_DIR = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

// ---------- helpers ----------------------------------------------------------

const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

// Run a handler and turn unexpected errors into a 500 response.
const handle = (label, fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        console.error(`${label} error:`, err);
        res.status(500).json({ error: `Server error: ${label}.` });
    }
};

// Load a ticket and decide what this agent may do with it.
//   canView  -> assigned to me, OR unassigned and in my team (team queue)
//   canWork  -> assigned to me
const loadTicket = async (ticketId, user, conn = db) => {
    const [rows] = await conn.query(
        'SELECT * FROM TICKET WHERE ticket_id = ?',
        [ticketId]
    );
    if (rows.length === 0) return { ticket: null };

    const ticket = rows[0];
    const isMine = ticket.assignee_id === user.user_id;
    const isTeamUnassigned =
        ticket.assignee_id === null &&
        user.team_id !== null &&
        ticket.team_id === user.team_id;

    return {
        ticket,
        canView: isMine || isTeamUnassigned,
        canWork: isMine
    };
};

const addHistory = (conn, ticketId, userId, field, oldValue, newValue) =>
    conn.query(
        `INSERT INTO TICKET_HISTORY (ticket_id, changed_by, field_name, old_value, new_value)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketId, userId, field, oldValue === null ? null : String(oldValue), newValue === null ? null : String(newValue)]
    );

const notify = (conn, userId, ticketId, message) =>
    conn.query(
        'INSERT INTO NOTIFICATIONS (user_id, ticket_id, message) VALUES (?, ?, ?)',
        [userId, ticketId, message]
    );

// Run `work(conn)` inside a transaction.
const withTransaction = async (work) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const QUEUE_COLUMNS = `
    T.ticket_id, T.ticket_no, T.subject, T.status, T.priority,
    T.assignee_id, T.requester_id, T.team_id,
    U.name AS requester_name,
    TM.team_name, C.name AS category_name,
    T.created_at, T.first_response_at, T.response_due, T.resolution_due,
    T.is_breached, T.warned_75, T.escalated_at
`;

// ---------- profile ----------------------------------------------------------

// GET /api/agent/me
exports.getMe = handle('loading profile', async (req, res) => {
    const [rows] = await db.query(
        `SELECT U.user_id, U.name, U.email, U.phone, U.role_id, U.team_id, TM.team_name
         FROM USER U LEFT JOIN TEAM TM ON U.team_id = TM.team_id
         WHERE U.user_id = ?`,
        [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
});

// ---------- ticket queue -----------------------------------------------------

// GET /api/agent/tickets?scope=mine|team
//   mine (default): tickets assigned to me
//   team          : unassigned tickets of my team that I can claim
exports.getQueue = handle('loading ticket queue', async (req, res) => {
    const scope = req.query.scope === 'team' ? 'team' : 'mine';
    let where;
    let params;

    if (scope === 'mine') {
        where = 'T.assignee_id = ?';
        params = [req.user.user_id];
    } else {
        if (req.user.team_id === null) return res.json([]);
        where = 'T.assignee_id IS NULL AND T.team_id = ?';
        params = [req.user.team_id];
    }

    const [tickets] = await db.query(
        `SELECT ${QUEUE_COLUMNS}
         FROM TICKET T
         JOIN USER U ON T.requester_id = U.user_id
         JOIN TEAM TM ON T.team_id = TM.team_id
         JOIN CATEGORY C ON T.category_id = C.category_id
         WHERE ${where}
         ORDER BY FIELD(T.priority, 'Critical', 'High', 'Medium', 'Low'), T.created_at ASC`,
        params
    );
    res.json(tickets);
});

// ---------- ticket detail ----------------------------------------------------

// GET /api/agent/tickets/:id
exports.getTicketDetail = handle('loading ticket', async (req, res) => {
    const ticketId = toId(req.params.id);
    if (!ticketId) return res.status(400).json({ error: 'Invalid ticket id.' });

    const { ticket, canView, canWork } = await loadTicket(ticketId, req.user);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (!canView) return res.status(403).json({ error: 'This ticket is not assigned to you.' });

    const [details] = await db.query(
        `SELECT T.*,
                R.name AS requester_name, R.email AS requester_email, R.phone AS requester_phone,
                A.name AS assignee_name,
                TM.team_name, C.name AS category_name,
                S.response_mins, S.resolution_mins, S.is_24x7
         FROM TICKET T
         JOIN USER R ON T.requester_id = R.user_id
         LEFT JOIN USER A ON T.assignee_id = A.user_id
         JOIN TEAM TM ON T.team_id = TM.team_id
         JOIN CATEGORY C ON T.category_id = C.category_id
         JOIN SLA_POLICY S ON T.sla_id = S.sla_id
         WHERE T.ticket_id = ?`,
        [ticketId]
    );

    // Agents see BOTH public replies and private notes (NFR-06 only hides
    // internal notes from requesters).
    const [comments] = await db.query(
        `SELECT CM.comment_id, CM.author_id, CM.body, CM.is_internal, CM.created_at,
                U.name AS author_name, U.role_id AS author_role_id
         FROM COMMENT CM JOIN USER U ON CM.author_id = U.user_id
         WHERE CM.ticket_id = ? ORDER BY CM.created_at ASC, CM.comment_id ASC`,
        [ticketId]
    );

    const [attachments] = await db.query(
        `SELECT AT.attachment_id, AT.comment_id, AT.file_name, AT.size_bytes, AT.uploaded_at,
                U.name AS uploaded_by_name
         FROM ATTACHMENT AT JOIN USER U ON AT.uploaded_by = U.user_id
         WHERE AT.ticket_id = ? ORDER BY AT.uploaded_at ASC`,
        [ticketId]
    );

    const [history] = await db.query(
        `SELECT H.history_id, H.field_name, H.old_value, H.new_value, H.changed_at,
                U.name AS changed_by_name
         FROM TICKET_HISTORY H JOIN USER U ON H.changed_by = U.user_id
         WHERE H.ticket_id = ? ORDER BY H.changed_at DESC, H.history_id DESC`,
        [ticketId]
    );

    const current = details[0];
    res.json({
        ticket: current,
        comments,
        attachments,
        history,
        permissions: {
            can_work: canWork,
            can_claim: !canWork && canView,
            allowed_statuses: canWork ? AGENT_TRANSITIONS[current.status] || [] : []
        }
    });
});

// ---------- claim / release --------------------------------------------------

// POST /api/agent/tickets/:id/claim   (assign an unassigned team ticket to me)
exports.claimTicket = handle('claiming ticket', async (req, res) => {
    const ticketId = toId(req.params.id);
    if (!ticketId) return res.status(400).json({ error: 'Invalid ticket id.' });

    const result = await withTransaction(async (conn) => {
        // Lock the row so two agents cannot claim the same ticket at once.
        const [rows] = await conn.query('SELECT * FROM TICKET WHERE ticket_id = ? FOR UPDATE', [ticketId]);
        if (rows.length === 0) return { code: 404, error: 'Ticket not found.' };

        const ticket = rows[0];
        if (ticket.assignee_id !== null) return { code: 409, error: 'Ticket is already assigned.' };
        if (req.user.team_id === null || ticket.team_id !== req.user.team_id) {
            return { code: 403, error: 'This ticket belongs to another team.' };
        }

        // New -> Open happens when a ticket gets assigned (SRS 7.3)
        const newStatus = ticket.status === 'New' ? 'Open' : ticket.status;

        await conn.query(
            'UPDATE TICKET SET assignee_id = ?, status = ? WHERE ticket_id = ?',
            [req.user.user_id, newStatus, ticketId]
        );
        await conn.query('UPDATE USER SET last_assigned_at = NOW() WHERE user_id = ?', [req.user.user_id]);
        await addHistory(conn, ticketId, req.user.user_id, 'assignee_id', null, req.user.user_id);
        if (newStatus !== ticket.status) {
            await addHistory(conn, ticketId, req.user.user_id, 'status', ticket.status, newStatus);
        }
        return { code: 200, status: newStatus };
    });

    if (result.error) return res.status(result.code).json({ error: result.error });
    res.json({ message: 'Ticket assigned to you.', status: result.status });
});

// POST /api/agent/tickets/:id/release   (give a New/Open ticket back to the team)
exports.releaseTicket = handle('releasing ticket', async (req, res) => {
    const ticketId = toId(req.params.id);
    if (!ticketId) return res.status(400).json({ error: 'Invalid ticket id.' });

    const result = await withTransaction(async (conn) => {
        const { ticket, canWork } = await loadTicket(ticketId, req.user, conn);
        if (!ticket) return { code: 404, error: 'Ticket not found.' };
        if (!canWork) return { code: 403, error: 'This ticket is not assigned to you.' };
        if (!['New', 'Open'].includes(ticket.status)) {
            return { code: 409, error: 'Only New or Open tickets can be released. Ask a supervisor to reassign.' };
        }

        await conn.query(
            "UPDATE TICKET SET assignee_id = NULL, status = 'New' WHERE ticket_id = ?",
            [ticketId]
        );
        await addHistory(conn, ticketId, req.user.user_id, 'assignee_id', req.user.user_id, null);
        if (ticket.status !== 'New') {
            await addHistory(conn, ticketId, req.user.user_id, 'status', ticket.status, 'New');
        }
        return { code: 200 };
    });

    if (result.error) return res.status(result.code).json({ error: result.error });
    res.json({ message: 'Ticket released back to the team queue.' });
});

// ---------- conversation (public reply / private note) -----------------------

// POST /api/agent/tickets/:id/comments   { body, is_internal }
exports.addComment = handle('posting comment', async (req, res) => {
    const ticketId = toId(req.params.id);
    if (!ticketId) return res.status(400).json({ error: 'Invalid ticket id.' });

    const body = clean(req.body.body);
    const isInternal = req.body.is_internal === true || req.body.is_internal === 1;

    if (!body) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (body.length > 10000) return res.status(400).json({ error: 'Message is too long (max 10,000 characters).' });

    const result = await withTransaction(async (conn) => {
        const { ticket, canWork } = await loadTicket(ticketId, req.user, conn);
        if (!ticket) return { code: 404, error: 'Ticket not found.' };
        if (!canWork) return { code: 403, error: 'You can only reply to tickets assigned to you.' };
        if (ticket.status === 'Closed') return { code: 409, error: 'Closed tickets cannot receive new messages.' };

        const [inserted] = await conn.query(
            'INSERT INTO COMMENT (ticket_id, author_id, body, is_internal) VALUES (?, ?, ?, ?)',
            [ticketId, req.user.user_id, body, isInternal]
        );

        if (!isInternal) {
            // First public reply stops the first-response SLA clock (FR-23/24)
            if (ticket.first_response_at === null) {
                await conn.query('UPDATE TICKET SET first_response_at = NOW() WHERE ticket_id = ?', [ticketId]);
            }
            await notify(conn, ticket.requester_id, ticketId, `New reply on ticket ${ticket.ticket_no}.`);
        }
        return { code: 201, commentId: inserted.insertId };
    });

    if (result.error) return res.status(result.code).json({ error: result.error });
    res.status(201).json({
        message: isInternal ? 'Private note added.' : 'Reply sent to requester.',
        comment_id: result.commentId
    });
});

// ---------- status -----------------------------------------------------------

// PATCH /api/agent/tickets/:id/status   { status, note }
// `note` is required when resolving (it becomes the public solution message).
exports.updateStatus = handle('updating status', async (req, res) => {
    const ticketId = toId(req.params.id);
    if (!ticketId) return res.status(400).json({ error: 'Invalid ticket id.' });

    const newStatus = clean(req.body.status);
    const note = clean(req.body.note);

    const result = await withTransaction(async (conn) => {
        const { ticket, canWork } = await loadTicket(ticketId, req.user, conn);
        if (!ticket) return { code: 404, error: 'Ticket not found.' };
        if (!canWork) return { code: 403, error: 'This ticket is not assigned to you.' };

        const allowed = AGENT_TRANSITIONS[ticket.status] || [];
        if (!allowed.includes(newStatus)) {
            return {
                code: 400,
                error: allowed.length
                    ? `Cannot move from "${ticket.status}" to "${newStatus || '(none)'}". Allowed: ${allowed.join(', ')}.`
                    : `No status changes are available for a ${ticket.status} ticket.`
            };
        }
        if (newStatus === 'Resolved' && !note) {
            return { code: 400, error: 'Please describe the solution before resolving the ticket.' };
        }

        // NOTE for Ketan (SLA owner): hold_started_at / paused_minutes are kept
        // in wall-clock minutes here. Replace with business-hour logic if needed.
        const sets = ['status = ?'];
        const params = [newStatus];

        if (newStatus === 'On Hold') {
            sets.push('hold_started_at = NOW()');
        }
        if (ticket.status === 'On Hold') {
            sets.push('paused_minutes = paused_minutes + COALESCE(TIMESTAMPDIFF(MINUTE, hold_started_at, NOW()), 0)');
            sets.push('hold_started_at = NULL');
        }
        if (newStatus === 'Resolved') {
            sets.push('resolved_at = NOW()');
        }

        await conn.query(`UPDATE TICKET SET ${sets.join(', ')} WHERE ticket_id = ?`, [...params, ticketId]);
        await addHistory(conn, ticketId, req.user.user_id, 'status', ticket.status, newStatus);

        if (note) {
            await conn.query(
                'INSERT INTO COMMENT (ticket_id, author_id, body, is_internal) VALUES (?, ?, ?, FALSE)',
                [ticketId, req.user.user_id, note]
            );
            if (ticket.first_response_at === null) {
                await conn.query('UPDATE TICKET SET first_response_at = NOW() WHERE ticket_id = ?', [ticketId]);
            }
        }
        await notify(conn, ticket.requester_id, ticketId, `Ticket ${ticket.ticket_no} is now "${newStatus}".`);

        return { code: 200 };
    });

    if (result.error) return res.status(result.code).json({ error: result.error });
    res.json({ message: `Status changed to ${newStatus}.`, status: newStatus });
});

// ---------- priority override (FR-14) ----------------------------------------

// PATCH /api/agent/tickets/:id/priority   { priority, reason }
exports.updatePriority = handle('updating priority', async (req, res) => {
    const ticketId = toId(req.params.id);
    if (!ticketId) return res.status(400).json({ error: 'Invalid ticket id.' });

    const priority = clean(req.body.priority);
    const reason = clean(req.body.reason);

    if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: `Priority must be one of: ${PRIORITIES.join(', ')}.` });
    }
    if (!reason) return res.status(400).json({ error: 'A reason is required to override the priority.' });

    const result = await withTransaction(async (conn) => {
        const { ticket, canWork } = await loadTicket(ticketId, req.user, conn);
        if (!ticket) return { code: 404, error: 'Ticket not found.' };
        if (!canWork) return { code: 403, error: 'This ticket is not assigned to you.' };
        if (['Resolved', 'Closed'].includes(ticket.status)) {
            return { code: 409, error: 'Priority cannot be changed on a resolved or closed ticket.' };
        }
        if (ticket.priority === priority) return { code: 400, error: 'Ticket already has this priority.' };

        const [slas] = await conn.query(
            'SELECT sla_id, response_mins, resolution_mins FROM SLA_POLICY WHERE priority = ?',
            [priority]
        );
        if (slas.length === 0) return { code: 400, error: 'No SLA policy exists for this priority.' };

        // Same simple formula as ticketController.createTicket (created_at + minutes).
        // Ketan's SLA engine should take over due-date recalculation later.
        await conn.query(
            `UPDATE TICKET
             SET priority = ?, sla_id = ?,
                 response_due = DATE_ADD(created_at, INTERVAL ? MINUTE),
                 resolution_due = DATE_ADD(created_at, INTERVAL ? MINUTE)
             WHERE ticket_id = ?`,
            [priority, slas[0].sla_id, slas[0].response_mins, slas[0].resolution_mins, ticketId]
        );
        await addHistory(conn, ticketId, req.user.user_id, 'priority', ticket.priority, `${priority} (reason: ${reason})`);
        return { code: 200 };
    });

    if (result.error) return res.status(result.code).json({ error: result.error });
    res.json({ message: `Priority changed to ${priority}.`, priority });
});

// ---------- attachments ------------------------------------------------------

// GET /api/agent/attachments/:id/download
exports.downloadAttachment = handle('downloading attachment', async (req, res) => {
    const attachmentId = toId(req.params.id);
    if (!attachmentId) return res.status(400).json({ error: 'Invalid attachment id.' });

    const [rows] = await db.query('SELECT * FROM ATTACHMENT WHERE attachment_id = ?', [attachmentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found.' });

    const attachment = rows[0];
    const { ticket, canView } = await loadTicket(attachment.ticket_id, req.user);
    if (!ticket || !canView) return res.status(403).json({ error: 'You do not have access to this attachment.' });

    // Resolve inside UPLOAD_DIR only (blocks "../" tricks and absolute paths).
    const filePath = path.resolve(UPLOAD_DIR, attachment.file_path);
    if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
        return res.status(403).json({ error: 'Invalid attachment location.' });
    }
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'The file is missing on the server.' });
    }

    res.download(filePath, attachment.file_name);
});

// ---------- knowledge base (FR-30, FR-32) ------------------------------------

// GET /api/agent/categories
exports.getCategories = handle('loading categories', async (req, res) => {
    const [rows] = await db.query('SELECT category_id, name, parent_id FROM CATEGORY ORDER BY name');
    res.json(rows);
});

// GET /api/agent/kb?scope=mine|published
exports.listArticles = handle('loading articles', async (req, res) => {
    const scope = req.query.scope === 'published' ? 'published' : 'mine';
    const where = scope === 'mine' ? 'K.author_id = ?' : "K.status = 'Published'";
    const params = scope === 'mine' ? [req.user.user_id] : [];

    const [rows] = await db.query(
        `SELECT K.article_id, K.title, K.status, K.views, K.category_id, K.author_id,
                K.created_at, K.updated_at,
                C.name AS category_name, U.name AS author_name
         FROM KB_ARTICLE K
         JOIN CATEGORY C ON K.category_id = C.category_id
         JOIN USER U ON K.author_id = U.user_id
         WHERE ${where}
         ORDER BY K.updated_at DESC`,
        params
    );
    res.json(rows);
});

// GET /api/agent/kb/:id
exports.getArticle = handle('loading article', async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid article id.' });

    const [rows] = await db.query(
        `SELECT K.*, C.name AS category_name, U.name AS author_name
         FROM KB_ARTICLE K
         JOIN CATEGORY C ON K.category_id = C.category_id
         JOIN USER U ON K.author_id = U.user_id
         WHERE K.article_id = ?`,
        [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Article not found.' });

    const article = rows[0];
    if (article.author_id !== req.user.user_id && article.status !== 'Published') {
        return res.status(403).json({ error: 'This draft belongs to another author.' });
    }
    res.json(article);
});

const validateArticle = (body, partial = false) => {
    const title = clean(body.title);
    const content = clean(body.content);
    const categoryId = toId(body.category_id);
    const status = body.status === undefined ? undefined : clean(body.status);

    if (!partial || body.title !== undefined) {
        if (!title) return { error: 'Title is required.' };
        if (title.length > 200) return { error: 'Title must be 200 characters or fewer.' };
    }
    if (!partial || body.content !== undefined) {
        if (!content) return { error: 'Content is required.' };
    }
    if (!partial || body.category_id !== undefined) {
        if (!categoryId) return { error: 'Please choose a category.' };
    }
    if (status !== undefined && !KB_STATUSES.includes(status)) {
        return { error: `Status must be one of: ${KB_STATUSES.join(', ')}.` };
    }
    return { title, content, categoryId, status };
};

// POST /api/agent/kb   { title, content, category_id, status? }
exports.createArticle = handle('creating article', async (req, res) => {
    const v = validateArticle(req.body);
    if (v.error) return res.status(400).json({ error: v.error });

    const [cat] = await db.query('SELECT category_id FROM CATEGORY WHERE category_id = ?', [v.categoryId]);
    if (cat.length === 0) return res.status(400).json({ error: 'Selected category does not exist.' });

    const [result] = await db.query(
        'INSERT INTO KB_ARTICLE (title, content, category_id, author_id, status) VALUES (?, ?, ?, ?, ?)',
        [v.title, v.content, v.categoryId, req.user.user_id, v.status || 'Draft']
    );
    res.status(201).json({ message: 'Article saved.', article_id: result.insertId });
});

// PUT /api/agent/kb/:id   { title?, content?, category_id?, status? }   (own articles only)
exports.updateArticle = handle('updating article', async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid article id.' });

    const [rows] = await db.query('SELECT author_id FROM KB_ARTICLE WHERE article_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Article not found.' });
    if (rows[0].author_id !== req.user.user_id) {
        return res.status(403).json({ error: 'You can only edit your own articles.' });
    }

    const v = validateArticle(req.body, true);
    if (v.error) return res.status(400).json({ error: v.error });

    const sets = [];
    const params = [];
    if (req.body.title !== undefined) { sets.push('title = ?'); params.push(v.title); }
    if (req.body.content !== undefined) { sets.push('content = ?'); params.push(v.content); }
    if (req.body.category_id !== undefined) { sets.push('category_id = ?'); params.push(v.categoryId); }
    if (v.status !== undefined) { sets.push('status = ?'); params.push(v.status); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    await db.query(`UPDATE KB_ARTICLE SET ${sets.join(', ')} WHERE article_id = ?`, [...params, id]);
    res.json({ message: 'Article updated.' });
});

// POST /api/agent/tickets/:id/kb-draft
// FR-32: turn a resolved ticket's solution into a DRAFT knowledge-base article.
exports.createDraftFromTicket = handle('creating KB draft', async (req, res) => {
    const ticketId = toId(req.params.id);
    if (!ticketId) return res.status(400).json({ error: 'Invalid ticket id.' });

    const { ticket, canWork } = await loadTicket(ticketId, req.user);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (!canWork) return res.status(403).json({ error: 'This ticket is not assigned to you.' });
    if (!['Resolved', 'Closed'].includes(ticket.status)) {
        return res.status(409).json({ error: 'Only resolved tickets can be converted into an article.' });
    }

    // Use the agent's public replies as the solution text (never private notes).
    const [replies] = await db.query(
        `SELECT body FROM COMMENT
         WHERE ticket_id = ? AND is_internal = FALSE AND author_id = ?
         ORDER BY created_at ASC, comment_id ASC`,
        [ticketId, req.user.user_id]
    );
    const solution = replies.length
        ? replies.map((r) => r.body).join('\n\n')
        : '(Add the solution steps here.)';

    const content = `Problem\n${ticket.description}\n\nSolution\n${solution}`;

    const [result] = await db.query(
        "INSERT INTO KB_ARTICLE (title, content, category_id, author_id, status) VALUES (?, ?, ?, ?, 'Draft')",
        [ticket.subject.slice(0, 200), content, ticket.category_id, req.user.user_id]
    );
    await withTransaction((conn) =>
        addHistory(conn, ticketId, req.user.user_id, 'kb_draft', null, `article #${result.insertId}`)
    );
    res.status(201).json({ message: 'Draft article created from ticket.', article_id: result.insertId });
});

// ---------- raise a ticket on behalf of a requester (FR-11) -------------------

const BEHALF_CHANNELS = ['Phone', 'Walk-in'];

// POST /api/agent/tickets
// { requester_email, subject, description, category_id, priority, channel }
// The agent who creates it becomes the assignee (ticket starts as Open).
exports.createTicketForRequester = handle('creating ticket', async (req, res) => {
    const email = clean(req.body.requester_email).toLowerCase();
    const subject = clean(req.body.subject);
    const description = clean(req.body.description);
    const categoryId = toId(req.body.category_id);
    const priority = clean(req.body.priority) || 'Medium';
    const channel = clean(req.body.channel) || 'Phone';

    if (!email) return res.status(400).json({ error: 'Requester email is required.' });
    if (!subject) return res.status(400).json({ error: 'Subject is required.' });
    if (subject.length > 200) return res.status(400).json({ error: 'Subject must be 200 characters or fewer.' });
    if (!description) return res.status(400).json({ error: 'Description is required.' });
    if (!categoryId) return res.status(400).json({ error: 'Please choose a category.' });
    if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: `Priority must be one of: ${PRIORITIES.join(', ')}.` });
    }
    if (!BEHALF_CHANNELS.includes(channel)) {
        return res.status(400).json({ error: `Channel must be one of: ${BEHALF_CHANNELS.join(', ')}.` });
    }

    const result = await withTransaction(async (conn) => {
        const [requesters] = await conn.query(
            'SELECT user_id, name FROM USER WHERE email = ? AND role_id = 1 AND is_active = TRUE',
            [email]
        );
        if (requesters.length === 0) {
            return { code: 404, error: 'No active requester account found for this email. Ask the requester to register first.' };
        }

        const [categories] = await conn.query(
            'SELECT default_team_id FROM CATEGORY WHERE category_id = ?',
            [categoryId]
        );
        if (categories.length === 0) return { code: 400, error: 'Selected category does not exist.' };

        const [slas] = await conn.query(
            'SELECT sla_id, response_mins, resolution_mins FROM SLA_POLICY WHERE priority = ?',
            [priority]
        );
        if (slas.length === 0) return { code: 400, error: 'No SLA policy exists for this priority.' };

        // Same numbering scheme as ticketController (HD-YYYY-######); retry if taken.
        const [countRows] = await conn.query('SELECT COUNT(*) AS count FROM TICKET');
        let sequence = Number(countRows[0].count) + 1;
        const year = new Date().getFullYear();
        let inserted = null;
        let ticketNo = '';

        for (let attempt = 0; attempt < 5 && !inserted; attempt++, sequence++) {
            ticketNo = `HD-${year}-${String(sequence).padStart(6, '0')}`;
            try {
                const [r] = await conn.query(
                    `INSERT INTO TICKET
                     (ticket_no, subject, description, status, priority, channel, requester_id, assignee_id,
                      team_id, category_id, sla_id, response_due, resolution_due)
                     VALUES (?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, ?,
                             DATE_ADD(NOW(), INTERVAL ? MINUTE), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
                    [
                        ticketNo, subject, description, priority, channel,
                        requesters[0].user_id, req.user.user_id,
                        categories[0].default_team_id, categoryId, slas[0].sla_id,
                        slas[0].response_mins, slas[0].resolution_mins
                    ]
                );
                inserted = r;
            } catch (err) {
                if (err.code !== 'ER_DUP_ENTRY') throw err;
            }
        }
        if (!inserted) return { code: 409, error: 'Could not generate a ticket number. Please try again.' };

        await addHistory(conn, inserted.insertId, req.user.user_id, 'created', null, `Raised by agent on behalf of requester (${channel})`);
        await notify(conn, requesters[0].user_id, inserted.insertId, `A support ticket ${ticketNo} was created for you.`);
        return { code: 201, ticketId: inserted.insertId, ticketNo };
    });

    if (result.error) return res.status(result.code).json({ error: result.error });
    res.status(201).json({
        message: `Ticket ${result.ticketNo} created.`,
        ticket_id: result.ticketId,
        ticket_no: result.ticketNo
    });
});

// ---------- in-app notifications (FR-27) --------------------------------------
// Other modules (assignment, requester replies, SLA warnings) simply INSERT rows
// into NOTIFICATIONS(user_id = agent, ticket_id, message); this bell shows them.

// GET /api/agent/notifications
exports.getNotifications = handle('loading notifications', async (req, res) => {
    const [items] = await db.query(
        `SELECT N.notification_id, N.ticket_id, N.message, N.is_read, N.created_at, T.ticket_no
         FROM NOTIFICATIONS N LEFT JOIN TICKET T ON N.ticket_id = T.ticket_id
         WHERE N.user_id = ?
         ORDER BY N.created_at DESC, N.notification_id DESC
         LIMIT 30`,
        [req.user.user_id]
    );
    const [unread] = await db.query(
        'SELECT COUNT(*) AS count FROM NOTIFICATIONS WHERE user_id = ? AND is_read = FALSE',
        [req.user.user_id]
    );
    res.json({ unread_count: Number(unread[0].count), items });
});

// POST /api/agent/notifications/read   { id? }   (no id = mark everything read)
exports.markNotificationsRead = handle('updating notifications', async (req, res) => {
    if (req.body && req.body.id !== undefined) {
        const id = toId(req.body.id);
        if (!id) return res.status(400).json({ error: 'Invalid notification id.' });
        await db.query(
            'UPDATE NOTIFICATIONS SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
            [id, req.user.user_id]
        );
    } else {
        await db.query('UPDATE NOTIFICATIONS SET is_read = TRUE WHERE user_id = ?', [req.user.user_id]);
    }
    res.json({ message: 'Notifications updated.' });
});
