
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Verify JWT and confirm the user is still active
exports.authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required. Please log in.'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            error: 'Server authentication configuration is missing.'
        });
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({
            error: err.name === 'TokenExpiredError'
                ? 'Session expired. Please log in again.'
                : 'Invalid authentication token.'
        });
    }

    try {
        const [users] = await db.query(
            `SELECT user_id, role_id, team_id, is_active
             FROM USER
             WHERE user_id = ?`,
            [decoded.user_id]
        );

        if (users.length === 0 || !users[0].is_active) {
            return res.status(401).json({
                error: 'User account is inactive or no longer exists.'
            });
        }

        req.user = {
            user_id: users[0].user_id,
            role_id: Number(users[0].role_id),
            team_id: users[0].team_id
        };

        next();

    } catch (err) {
        console.error('Authentication error:', err);

        return res.status(500).json({
            error: 'Unable to verify user authentication.'
        });
    }
};


// Allow only Agent accounts (Role ID: 2)
exports.requireAgent = (req, res, next) => {
    if (!req.user || req.user.role_id !== 2) {
        return res.status(403).json({
            error: 'Access denied. Agent permissions are required.'
        });
    }

    next();
};
