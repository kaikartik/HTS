// backend/utils/http.js
// Small helpers shared by the controllers: errors with an HTTP status, transactions, ids and "now".

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Sends the right response for an error: HttpError -> its own status, anything else -> 500 (and logs it).
function sendError(res, err, label = 'Request error') {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(`${label}:`, err);
  return res.status(500).json({ error: 'Server error.' });
}

// Runs work(conn) inside a transaction: commit when it finishes, roll back when it throws.
async function withTransaction(db, work) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      // the connection is already gone, nothing else to do
    }
    throw err;
  } finally {
    conn.release();
  }
}

// '12' -> 12; anything that is not a positive whole number -> null
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// TIMESTAMP columns keep whole seconds, so "now" is rounded down to the second.
function wholeSecondsNow() {
  const now = new Date();
  now.setMilliseconds(0);
  return now;
}

module.exports = { HttpError, sendError, withTransaction, parseId, wholeSecondsNow };