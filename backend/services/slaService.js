// backend/services/slaService.js
// Database side of the SLA: policies and the business-hours calendar.

const { buildCalendar, twentyFourSevenCalendar } = require('../utils/businessTime');

async function getSlaPolicy(conn, priority) {
  const [rows] = await conn.query(
    'SELECT sla_id, priority, response_mins, resolution_mins, is_24x7 FROM SLA_POLICY WHERE priority = ? LIMIT 1',
    [priority]
  );
  return rows[0] || null;
}

// Reads BUSINESS_HOURS and HOLIDAYS and turns them into a calendar object.
async function loadBusinessCalendar(conn) {
  const [hours] = await conn.query('SELECT day_of_week, start_time, end_time, is_working_day FROM BUSINESS_HOURS');
  const [holidays] = await conn.query('SELECT CAST(holiday_date AS CHAR) AS d FROM HOLIDAYS');
  return buildCalendar(hours, holidays.map((h) => String(h.d).slice(0, 10)));
}

// Critical (24x7) policies use a round-the-clock calendar, everything else the business calendar.
function calendarFor(sla, businessCalendar) {
  return Number(sla.is_24x7) === 1 ? twentyFourSevenCalendar() : businessCalendar;
}

module.exports = { getSlaPolicy, loadBusinessCalendar, calendarFor };