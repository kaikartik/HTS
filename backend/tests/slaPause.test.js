// backend/tests/slaPause.test.js
// The SLA clock stops while a ticket is On Hold: when it resumes, the due times move back by the business time spent on hold.
const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultCalendar, twentyFourSevenCalendar, buildCalendar } = require('../utils/businessTime');
const { computeResumeDates } = require('../utils/sla');

const ist = (text) => new Date(text.replace(' ', 'T') + ':00+05:30');
const fmt = (d) => new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 19).replace('T', ' ');

const onHold = (holdStarted, extra = {}) => ({
  hold_started_at: ist(holdStarted),
  first_response_at: ist('2026-11-16 09:30'),
  response_due: ist('2026-11-16 10:00'),
  resolution_due: ist('2026-11-16 18:00'),
  ...extra,
});

// 2026-11-16 is a Monday.

test('a short hold inside one day moves the resolution due time by the same minutes', () => {
  const r = computeResumeDates(onHold('2026-11-16 12:00'), defaultCalendar(), ist('2026-11-16 14:00'));
  assert.equal(r.held_minutes, 120);
  assert.equal(fmt(r.resolution_due), '2026-11-17 11:00:00'); // Mon 18:00 + 120 business minutes
});

test('nights and weekends on hold do not count', () => {
  const overnight = computeResumeDates(onHold('2026-11-16 17:00'), defaultCalendar(), ist('2026-11-17 10:00'));
  assert.equal(overnight.held_minutes, 120); // 17:00-18:00 and 09:00-10:00
  const weekend = computeResumeDates(onHold('2026-11-20 17:00'), defaultCalendar(), ist('2026-11-23 10:00'));
  assert.equal(weekend.held_minutes, 120);
});

test('a hold that starts outside business hours only counts the working time', () => {
  const r = computeResumeDates(onHold('2026-11-21 10:00'), defaultCalendar(), ist('2026-11-23 10:00')); // Saturday -> Monday
  assert.equal(r.held_minutes, 60);
});

test('holidays on hold do not count', () => {
  const cal = buildCalendar([], ['2026-11-17']);
  const r = computeResumeDates(onHold('2026-11-16 17:00'), cal, ist('2026-11-18 10:00'));
  assert.equal(r.held_minutes, 120);
});

test('a 24x7 ticket counts every minute on hold', () => {
  const r = computeResumeDates(onHold('2026-11-21 10:00', { resolution_due: ist('2026-11-21 14:00') }), twentyFourSevenCalendar(), ist('2026-11-21 12:00'));
  assert.equal(r.held_minutes, 120);
  assert.equal(fmt(r.resolution_due), '2026-11-21 16:00:00');
});

test('the response due time only moves while there is still no first response', () => {
  const withResponse = computeResumeDates(onHold('2026-11-16 12:00'), defaultCalendar(), ist('2026-11-16 13:00'));
  assert.equal(fmt(withResponse.response_due), '2026-11-16 10:00:00');
  const noResponse = computeResumeDates(onHold('2026-11-16 12:00', { first_response_at: null }), defaultCalendar(), ist('2026-11-16 13:00'));
  assert.equal(fmt(noResponse.response_due), '2026-11-16 11:00:00');
});

test('a ticket that was not on hold keeps its due times', () => {
  const r = computeResumeDates(onHold('2026-11-16 12:00', { hold_started_at: null }), defaultCalendar(), ist('2026-11-16 14:00'));
  assert.equal(r.held_minutes, 0);
  assert.equal(fmt(r.resolution_due), '2026-11-16 18:00:00');
});

test('seconds are kept (30 seconds on hold moves the due time by 30 seconds)', () => {
  const start = ist('2026-11-16 12:00');
  const r = computeResumeDates({ ...onHold('2026-11-16 12:00') }, defaultCalendar(), new Date(start.getTime() + 30000));
  assert.equal(r.held_minutes, 0.5);
  assert.equal(fmt(r.resolution_due), '2026-11-17 09:00:30'); // 18:00 is closing time, so the extra 30s starts next morning
});