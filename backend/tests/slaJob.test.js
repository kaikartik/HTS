// backend/tests/slaJob.test.js
// decideSlaAction: what the SLA job does with one ticket (warn at 75%, escalate on breach, never twice).
const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultCalendar, twentyFourSevenCalendar } = require('../utils/businessTime');
const { computeDueDates } = require('../utils/sla');
const { decideSlaAction } = require('../jobs/slaJob');

const ist = (text) => new Date(text.replace(' ', 'T') + ':00+05:30');
const HIGH = { response_mins: 60, resolution_mins: 480 };
const CRITICAL = { response_mins: 30, resolution_mins: 240 };

function ticketFor(created, sla, cal = defaultCalendar(), extra = {}) {
  const due = computeDueDates(ist(created), sla, cal);
  return { status: 'Open', is_breached: 0, warned_75: 0, first_response_at: null, hold_started_at: null, ...due, ...extra };
}
const decide = (ticket, sla, now, cal = defaultCalendar()) => decideSlaAction(ticket, sla, cal, ist(now));

// 2026-11-16 is a Monday.

test('nothing happens while the ticket is well inside its SLA', () => {
  assert.equal(decide(ticketFor('2026-11-16 10:00', HIGH), HIGH, '2026-11-16 10:30').action, null);
});

test('at 75% of the response time the agent is warned', () => {
  assert.deepEqual(decide(ticketFor('2026-11-16 10:00', HIGH), HIGH, '2026-11-16 10:45'), { action: 'warn', timer: 'response' });
});

test('the warning is sent only once', () => {
  assert.equal(decide(ticketFor('2026-11-16 10:00', HIGH, defaultCalendar(), { warned_75: 1 }), HIGH, '2026-11-16 10:50').action, null);
});

test('after the due time the ticket is escalated', () => {
  assert.deepEqual(decide(ticketFor('2026-11-16 10:00', HIGH), HIGH, '2026-11-16 11:05'), { action: 'breach', timer: 'response' });
});

test('a ticket that is already flagged is left alone', () => {
  assert.equal(decide(ticketFor('2026-11-16 10:00', HIGH, defaultCalendar(), { is_breached: 1 }), HIGH, '2026-11-16 12:00').action, null);
});

test('after the first response the resolution timer is watched', () => {
  const t = ticketFor('2026-11-16 10:00', HIGH, defaultCalendar(), { first_response_at: ist('2026-11-16 10:05') });
  assert.equal(decide(t, HIGH, '2026-11-16 15:00').action, null);
  assert.deepEqual(decide(t, HIGH, '2026-11-16 16:00'), { action: 'warn', timer: 'resolution' });
  assert.deepEqual(decide(t, HIGH, '2026-11-16 18:01'), { action: 'breach', timer: 'resolution' });
});

test('a ticket On Hold is never warned or escalated', () => {
  const t = ticketFor('2026-11-16 10:00', HIGH, defaultCalendar(), {
    status: 'On Hold',
    first_response_at: ist('2026-11-16 10:05'),
    hold_started_at: ist('2026-11-16 12:00'),
  });
  assert.equal(decide(t, HIGH, '2026-11-20 12:00').action, null);
});

test('nights and weekends do not count towards the warning', () => {
  const t = ticketFor('2026-11-20 17:30', HIGH); // response due Monday 09:30
  assert.equal(decide(t, HIGH, '2026-11-21 12:00').action, null); // Saturday: only 30 of 60 minutes used
  assert.deepEqual(decide(t, HIGH, '2026-11-23 09:15'), { action: 'warn', timer: 'response' });
});

test('a 24x7 Critical ticket is watched round the clock', () => {
  const cal = twentyFourSevenCalendar();
  const t = ticketFor('2026-11-21 23:00', CRITICAL, cal);
  assert.equal(decide(t, CRITICAL, '2026-11-21 23:20', cal).action, null);
  assert.deepEqual(decide(t, CRITICAL, '2026-11-21 23:23', cal), { action: 'warn', timer: 'response' });
  assert.deepEqual(decide(t, CRITICAL, '2026-11-21 23:31', cal), { action: 'breach', timer: 'response' });
});