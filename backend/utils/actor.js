// backend/utils/actor.js
// Who is calling the API? Kartik's login does not return a token yet, so for now the frontend
// sends the logged-in user's id in the "x-user-id" header. When real tokens (JWT) are added,
// only this file has to change.

const db = require('../config/db');

async function getActor(req) {
  const id = Number(req.headers['x-user-id']);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [rows] = await db.query(
    `SELECT u.user_id, u.name, u.team_id, r.role_name
     FROM USER u
     JOIN ROLE r ON r.role_id = u.role_id
     WHERE u.user_id = ? AND u.is_active = 1`,
    [id]
  );
  return rows[0] || null;
}

// requireRole('Supervisor', 'Admin') -> only these roles. requireRole() -> any logged-in user.
// The user is then available as req.actor = { user_id, name, team_id, role_name }.
function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const actor = await getActor(req);
      if (!actor) {
        return res.status(401).json({ error: 'Send the logged-in user id in the x-user-id header.' });
      }
      if (roles.length > 0 && !roles.includes(actor.role_name)) {
        return res.status(403).json({ error: `Only ${roles.join(' or ')} can do this.` });
      }
      req.actor = actor;
      next();
    } catch (err) {
      console.error('Actor lookup error:', err);
      res.status(500).json({ error: 'Server error.' });
    }
  };
}

module.exports = { getActor, requireRole };