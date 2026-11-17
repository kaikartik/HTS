// backend/tests/sla.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultCalendar, twentyFourSevenCalendar } = require('../utils/businessTime');
const { computeDueDates, computeSlaStatus } = require('../utils/sla');

const ist = (text) => new Date(text.replace(' ', 'T') + ':00+05:30');
const fmt = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16).replace('T', ' ');

const CRITICAL = { response_mins: 30, resolution_mins: 240 };
const HIGH = { response_mins: 60, resolution_mins: 480 };
const MEDIUM = { response_mins: 240, resolution_mins: 1620 };

// A ticket created at `created`, with due dates worked out on the business calendar.
function ticketFor(created, sla, extra = {}) {
  const due = computeDueDates(ist(created), sla, defaultCalendar());
  return { status: 'Open', is_breached: 0, first_response_at: null, hold_started_at: null, ...due, ...extra };
}
const statusAt = (ticket, sla, now, cal = defaultCalendar()) => computeSlaStatus(ticket, sla, cal, ist(now));

// 2026-11-16 is a Monday.

test('High ticket created Mon 10:00 is due for response 11:00 and resolution 18:00', () => {
  const due = computeDueDates(ist('2026-11-16 10:00'), HIGH, defaultCalendar());
  assert.equal(fmt(due.response_due), '2026-11-16 11:00');
  assert.equal(fmt(due.resolution_due), '2026-11-16 18:00');
});

test('Critical ticket uses the 24x7 clock, even at night', () => {
  const due = computeDueDates(ist('2026-11-21 23:00'), CRITICAL, twentyFourSevenCalendar());
  assert.equal(fmt(due.response_due), '2026-11-21 23:30');
  assert.equal(fmt(due.resolution_due), '2026-11-22 03:00');
});

test('Medium ticket created Friday 17:00 skips the weekend', () => {
  const due = computeDueDates(ist('2026-11-20 17:00'), MEDIUM, defaultCalendar());
  assert.equal(fmt(due.response_due), '2026-11-23 12:00');
  assert.equal(fmt(due.resolution_due), '2026-11-25 17:00');
});

test('response timer: ok -> warning at exactly 75% -> breached after the due time', () => {
  const t = ticketFor('2026-11-16 10:00', HIGH);
  assert.deepEqual(statusAt(t, HIGH, '2026-11-16 10:10'), { sla_status: 'ok', sla_timer: 'response', sla_percent: 17 });
  assert.equal(statusAt(t, HIGH, '2026-11-16 10:44').sla_status, 'ok');
  assert.equal(statusAt(t, HIGH, '2026-11-16 10:45').sla_status, 'warning');
  assert.equal(statusAt(t, HIGH, '2026-11-16 11:00').sla_status, 'breached');
  assert.equal(statusAt(t, HIGH, '2026-11-16 11:30').sla_status, 'breached');
});

test('after the first response the resolution timer is used', () => {
  const t = ticketFor('2026-11-16 10:00', HIGH, { first_response_at: ist('2026-11-16 10:05') });
  assert.equal(statusAt(t, HIGH, '2026-11-16 15:59').sla_status, 'ok');
  assert.deepEqual(statusAt(t, HIGH, '2026-11-16 16:00'), { sla_status: 'warning', sla_timer: 'resolution', sla_percent: 75 });
  assert.equal(statusAt(t, HIGH, '2026-11-16 18:00').sla_status, 'breached');
});

test('an On Hold ticket is paused and its clock stays where it stopped', () => {
  const t = ticketFor('2026-11-16 10:00', HIGH, {
    status: 'On Hold',
    first_response_at: ist('2026-11-16 10:05'),
    hold_started_at: ist('2026-11-16 12:00'),
  });
  const result = statusAt(t, HIGH, '2026-11-17 10:00');
  assert.deepEqual(result, { sla_status: 'paused', sla_timer: 'resolution', sla_percent: 25 });
});

test('Resolved / Closed tickets are met, or breached if the flag was set', () => {
  assert.equal(statusAt(ticketFor('2026-11-16 10:00', HIGH, { status: 'Resolved' }), HIGH, '2026-11-20 10:00').sla_status, 'met');
  assert.equal(statusAt(ticketFor('2026-11-16 10:00', HIGH, { status: 'Closed', is_breached: 1 }), HIGH, '2026-11-20 10:00').sla_status, 'breached');
});

test('the breached flag wins even before the due time', () => {
  const t = ticketFor('2026-11-16 10:00', HIGH, { is_breached: 1 });
  assert.equal(statusAt(t, HIGH, '2026-11-16 10:01').sla_status, 'breached');
});

test('time that passes outside business hours does not use up the SLA', () => {
  const t = ticketFor('2026-11-20 17:30', MEDIUM); // response due Mon 12:30
  assert.equal(fmt(t.response_due), '2026-11-23 12:30');
  const sunday = statusAt(t, MEDIUM, '2026-11-22 12:00');
  assert.deepEqual(sunday, { sla_status: 'ok', sla_timer: 'response', sla_percent: 13 }); // only 30 of 240 minutes used
});

test('24x7 tickets are measured on the round-the-clock calendar', () => {
  const cal = twentyFourSevenCalendar();
  const due = computeDueDates(ist('2026-11-21 23:00'), CRITICAL, cal);
  const t = { status: 'Open', is_breached: 0, first_response_at: null, hold_started_at: null, ...due };
  assert.equal(statusAt(t, CRITICAL, '2026-11-21 23:23', cal).sla_status, 'warning'); // 23 of 30 minutes
});