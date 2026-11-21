const db = require('../config/db');

// Helper function to generate unique ticket number (FR-09: e.g., HD-2026-000123)
const generateTicketNumber = async () => {
    const year = new Date().getFullYear();
    const [rows] = await db.query('SELECT COUNT(*) as count FROM TICKET');
    const nextId = rows[0].count + 1;
    const paddedId = String(nextId).padStart(6, '0');
    return `HD-${year}-${paddedId}`;
};

// 1. Create a New Ticket (FR-08, FR-09, FR-14, FR-15)
exports.createTicket = async (req, res) => {
    try {
        const { subject, description, category_id, priority = 'Medium', requester_id, channel = 'Portal' } = req.body;

        // Validate required fields
        if (!subject || !description || !category_id || !requester_id) {
            return res.status(400).json({ error: 'Please provide subject, description, category_id, and requester_id.' });
        }

        // 1. Fetch default team from the selected category
        const [categories] = await db.query('SELECT default_team_id FROM CATEGORY WHERE category_id = ?', [category_id]);
        if (categories.length === 0) {
            return res.status(404).json({ error: 'Invalid category selected.' });
        }
        const team_id = categories[0].default_team_id;

        // 2. Fetch matching SLA policy based on priority
        const [slas] = await db.query('SELECT sla_id, response_mins, resolution_mins FROM SLA_POLICY WHERE priority = ?', [priority]);
        const sla_id = slas.length > 0 ? slas[0].sla_id : 1; // Default to first SLA if not found

        // 3. Generate unique ticket number
        const ticket_no = await generateTicketNumber();

        // 4. Calculate SLA response & resolution due timestamps
        const now = new Date();
        const responseDue = new Date(now.getTime() + (slas[0]?.response_mins || 240) * 60000);
        const resolutionDue = new Date(now.getTime() + (slas[0]?.resolution_mins || 1440) * 60000);

        // 5. Insert Ticket into Database
        const query = `
            INSERT INTO TICKET 
            (ticket_no, subject, description, status, priority, channel, requester_id, team_id, category_id, sla_id, response_due, resolution_due) 
            VALUES (?, ?, ?, 'New', ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.query(query, [
            ticket_no, 
            subject, 
            description, 
            priority, 
            channel, 
            requester_id, 
            team_id, 
            category_id, 
            sla_id, 
            responseDue, 
            resolutionDue
        ]);

        res.status(201).json({
            message: 'Ticket created successfully!',
            ticketId: result.insertId,
            ticket_no: ticket_no
        });

    } catch (err) {
        console.error('Create ticket error:', err);
        res.status(500).json({ error: 'Server error while creating ticket.' });
    }
};

// 2. Get All Tickets (For testing / viewing lists)
exports.getTickets = async (req, res) => {
    try {
        const [tickets] = await db.query(`
            SELECT
            T.ticket_id, T.ticket_no, T.subject, T.status, T.priority, 
            U.name AS requester_name, TM.team_name, C.name AS category_name, T.created_at
            FROM TICKET T
            JOIN USER U ON T.requester_id = U.user_id
            JOIN TEAM TM ON T.team_id = TM.team_id
            JOIN CATEGORY C ON T.category_id = C.category_id
            ORDER BY T.created_at DESC
        `);
        res.json(tickets);
    } catch (err) {
        console.error('Fetch tickets error:', err);
        res.status(500).json({ error: 'Server error while fetching tickets.' });
    }
};

// 3. Get Tickets Assigned to the Logged-in Agent
exports.getAssignedTickets = async (req, res) => {
    try {
        // User identity comes from the verified JWT middleware.
        // Do not accept the agent ID from the browser.
        const agentId = req.user.user_id;

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
        `, [agentId]);

        return res.json(tickets);

    } catch (err) {
        console.error('Fetch assigned tickets error:', err);

        return res.status(500).json({
            error: 'Server error while fetching assigned tickets.'
        });
    }
};
