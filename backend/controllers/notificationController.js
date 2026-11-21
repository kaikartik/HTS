const db = require('../config/db');
const { HttpError, sendError, parseId } = require('../utils/http');

// GET /api/notifications   -> my notifications, newest first (add ?unread=1 for the unread ones only)
exports.getMyNotifications = async (req, res) => {
    try {
        const onlyUnread = req.query.unread === '1' || req.query.unread === 'true';
        const [rows] = await db.query(
            `SELECT N.notification_id, N.ticket_id, T.ticket_no, N.message, N.is_read, N.created_at
             FROM NOTIFICATIONS N
             LEFT JOIN TICKET T ON T.ticket_id = N.ticket_id
             WHERE N.user_id = ? ${onlyUnread ? 'AND N.is_read = 0' : ''}
             ORDER BY N.notification_id DESC
             LIMIT 50`,
            [req.actor.user_id]
        );
        const [[unread]] = await db.query('SELECT COUNT(*) AS c FROM NOTIFICATIONS WHERE user_id = ? AND is_read = 0', [req.actor.user_id]);
        res.json({
            unread_count: Number(unread.c),
            notifications: rows.map((n) => ({ ...n, is_read: Boolean(n.is_read) })),
        });
    } catch (err) {
        sendError(res, err, 'Notifications error');
    }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) throw new HttpError(400, 'Notification id must be a number.');
        const [found] = await db.query('SELECT notification_id FROM NOTIFICATIONS WHERE notification_id = ? AND user_id = ?', [id, req.actor.user_id]);
        if (found.length === 0) throw new HttpError(404, 'Notification not found.');
        await db.query('UPDATE NOTIFICATIONS SET is_read = 1 WHERE notification_id = ?', [id]);
        res.json({ message: 'Marked as read.' });
    } catch (err) {
        sendError(res, err, 'Mark read error');
    }
};

// POST /api/notifications/read-all
exports.markAllRead = async (req, res) => {
    try {
        await db.query('UPDATE NOTIFICATIONS SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.actor.user_id]);
        res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
        sendError(res, err, 'Mark all read error');
    }
};