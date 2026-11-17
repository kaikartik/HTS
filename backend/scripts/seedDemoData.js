// backend/scripts/seedDemoData.js
// Safe to run more than once. From the backend folder run:  node scripts/seedDemoData.js
// Adds teams, categories, business hours, holidays, correct SLA values and demo users.
// LOCAL TESTING ONLY: every demo user gets the same password.

const bcrypt = require('bcrypt');
const db = require('../config/db');

const DEMO_PASSWORD = 'Test@1234';

const TEAMS = [
  ['IT Support Team', 'it-support@helpdesk.com'], // already created by schema.sql
  ['Electrical Team', 'electrical@helpdesk.com'],
  ['Carpentry Team', 'carpentry@helpdesk.com'],
  ['Plumbing Team', 'plumbing@helpdesk.com'],
  ['Housekeeping Team', 'housekeeping@helpdesk.com'],
  ['Admin Support Team', 'admin-support@helpdesk.com'],
];

const CATEGORIES = [
  ['Network / IT', 'IT Support Team'], // already created by schema.sql
  ['Electrical', 'Electrical Team'],
  ['Carpentry', 'Carpentry Team'],
  ['Plumbing', 'Plumbing Team'],
  ['Housekeeping', 'Housekeeping Team'],
  ['Other / Admin', 'Admin Support Team'],
];

// [name, email, role, team or null, is_active]
const USERS = [
  ['System', 'system@helpdesk.local', 'Admin', null, false], // used for automatic changes, cannot log in
  ['Demo Admin', 'admin@helpdesk.local', 'Admin', null, true],
  ['Demo Supervisor', 'supervisor@helpdesk.local', 'Supervisor', null, true],
  ['Demo Requester', 'requester@helpdesk.local', 'Requester', null, true],
  ['Demo Requester Two', 'requester2@helpdesk.local', 'Requester', null, true],
  ['IT Agent One', 'agent.it1@helpdesk.local', 'Agent', 'IT Support Team', true],
  ['IT Agent Two', 'agent.it2@helpdesk.local', 'Agent', 'IT Support Team', true],
  ['Electrical Agent', 'agent.electrical@helpdesk.local', 'Agent', 'Electrical Team', true],
  ['Carpentry Agent', 'agent.carpentry@helpdesk.local', 'Agent', 'Carpentry Team', true],
  ['Plumbing Agent', 'agent.plumbing@helpdesk.local', 'Agent', 'Plumbing Team', true],
  ['Housekeeping Agent', 'agent.housekeeping@helpdesk.local', 'Agent', 'Housekeeping Team', true],
  ['Admin Support Agent', 'agent.admin@helpdesk.local', 'Agent', 'Admin Support Team', true],
];

const WEEK = [
  ['Monday', true],
  ['Tuesday', true],
  ['Wednesday', true],
  ['Thursday', true],
  ['Friday', true],
  ['Saturday', false],
  ['Sunday', false],
];

const HOLIDAYS = [
  ['2026-12-25', 'Christmas Day'],
  ['2027-01-26', 'Republic Day'],
];

async function main() {
  // 1. Teams
  for (const [name, email] of TEAMS) {
    const [rows] = await db.query('SELECT team_id FROM TEAM WHERE team_name = ?', [name]);
    if (rows.length === 0) await db.query('INSERT INTO TEAM (team_name, email) VALUES (?, ?)', [name, email]);
  }
  const [teamRows] = await db.query('SELECT team_id, team_name FROM TEAM');
  const teamId = Object.fromEntries(teamRows.map((t) => [t.team_name, t.team_id]));

  // 2. Categories (each one maps to a default team)
  for (const [name, teamName] of CATEGORIES) {
    const [rows] = await db.query('SELECT category_id FROM CATEGORY WHERE name = ?', [name]);
    if (rows.length === 0) {
      await db.query('INSERT INTO CATEGORY (name, parent_id, default_team_id) VALUES (?, NULL, ?)', [name, teamId[teamName]]);
    }
  }

  // 3. SLA fix: Medium = 3 business days, Low = 5 business days (9-hour business day)
  await db.query("UPDATE SLA_POLICY SET resolution_mins = 1620 WHERE priority = 'Medium'");
  await db.query("UPDATE SLA_POLICY SET resolution_mins = 2700 WHERE priority = 'Low'");

  // 4. Business hours (Mon-Fri 09:00-18:00) - only when the table is empty
  const [[hours]] = await db.query('SELECT COUNT(*) AS c FROM BUSINESS_HOURS');
  if (hours.c === 0) {
    for (const [day, working] of WEEK) {
      await db.query(
        'INSERT INTO BUSINESS_HOURS (day_of_week, start_time, end_time, is_working_day) VALUES (?, ?, ?, ?)',
        [day, '09:00:00', '18:00:00', working]
      );
    }
  }

  // 5. Holidays
  for (const [date, description] of HOLIDAYS) {
    await db.query('INSERT IGNORE INTO HOLIDAYS (holiday_date, description) VALUES (?, ?)', [date, description]);
  }

  // 6. Demo users (same bcrypt hashing as the real register API)
  const [roleRows] = await db.query('SELECT role_id, role_name FROM ROLE');
  const roleId = Object.fromEntries(roleRows.map((r) => [r.role_name, r.role_id]));
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const [name, email, role, teamName, active] of USERS) {
    const [rows] = await db.query('SELECT user_id FROM USER WHERE email = ?', [email]);
    if (rows.length === 0) {
      await db.query(
        'INSERT INTO USER (name, email, password_hash, role_id, team_id, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, passwordHash, roleId[role], teamName ? teamId[teamName] : null, active]
      );
    }
  }

  // Summary
  const [users] = await db.query(`
    SELECT u.user_id, u.email, r.role_name AS role, t.team_name AS team, u.is_active
    FROM USER u
    JOIN ROLE r ON r.role_id = u.role_id
    LEFT JOIN TEAM t ON t.team_id = u.team_id
    ORDER BY u.user_id`);
  console.table(users);
  const [slas] = await db.query('SELECT priority, response_mins, resolution_mins, is_24x7 FROM SLA_POLICY ORDER BY sla_id');
  console.table(slas);
  console.log(`Seed finished. Password for every demo user: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());