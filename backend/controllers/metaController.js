const db = require('../config/db');
const { sendError, parseId, HttpError } = require('../utils/http');
const { STATUSES, REOPEN_WINDOW_DAYS } = require('../utils/transitions');
const { PRIORITIES } = require('../utils/priority');
const { OPEN_STATUSES } = require('../services/assignmentService');

// GET /api/meta  -> everything the frontends need for their dropdowns
exports.getMeta = async (req, res) => {
    try {
        const [categories] = await db.query(
            `SELECT C.category_id, C.name, C.parent_id, C.default_team_id, TM.team_name AS default_team_name
             FROM CATEGORY C
             LEFT JOIN TEAM TM ON TM.team_id = C.default_team_id
             ORDER BY C.name`
        );
        const [teams] = await db.query('SELECT team_id, team_name FROM TEAM ORDER BY team_name');
        const [roles] = await db.query('SELECT role_id, role_name FROM ROLE ORDER BY role_id');
        res.json({
            statuses: STATUSES,
            priorities: PRIORITIES,
            impact_levels: ['Low', 'Medium', 'High'],
            urgency_levels: ['Low', 'Medium', 'High'],
            reopen_window_days: REOPEN_WINDOW_DAYS,
            categories,
            teams,
            roles,
        });
    } catch (err) {
        sendError(res, err, 'Meta error');
    }
};

// GET /api/meta/agents?team_id=1   (Supervisor / Admin) -> active agents with their open tickets (for the assign dropdown)
exports.getAgents = async (req, res) => {
    try {
        const marks = OPEN_STATUSES.map(() => '?').join(', ');
        const params = [...OPEN_STATUSES];
        let where = "r.role_name = 'Agent' AND u.is_active = 1";
        if (req.query.team_id !== undefined) {
            const teamId = parseId(req.query.team_id);
            if (!teamId) throw new HttpError(400, 'team_id must be a number.');
            where += ' AND u.team_id = ?';
            params.push(teamId);
        }
        const [agents] = await db.query(
            `SELECT u.user_id, u.name, u.email, u.team_id, TM.team_name,
                    (SELECT COUNT(*) FROM TICKET k WHERE k.assignee_id = u.user_id AND k.status IN (${marks})) AS open_tickets
             FROM USER u
             JOIN ROLE r ON r.role_id = u.role_id
             LEFT JOIN TEAM TM ON TM.team_id = u.team_id
             WHERE ${where}
             ORDER BY u.name`,
            params
        );
        res.json(agents);
    } catch (err) {
        sendError(res, err, 'Agents error');
    }
};