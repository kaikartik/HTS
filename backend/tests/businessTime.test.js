// backend/tests/businessTime.test.js
// Run with:  npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  defaultCalendar,
  twentyFourSevenCalendar,
  buildCalendar,
  addBusinessMinutes,
  businessMinutesBetween,
  istDateKey,
} = require('../utils/businessTime');

// ist('2026-11-16 10:00') -> the instant that is 10:00 in India
const ist = (text) => new Date(text.replace(' ', 'T') + ':00+05:30');
// fmt(date) -> 'YYYY-MM-DD HH:mm' in India time, so results are easy to read
const fmt = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16).replace('T', ' ');

// 2026-11-16 is a Monday, 2026-11-20 a Friday, 2026-11-21 a Saturday.

test('adds minutes inside the same working day', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 10:00'), 60)), '2026-11-16 11:00');
});

test('rolls over to the next morning after closing time', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 17:30'), 60)), '2026-11-17 09:30');
});

test('landing exactly on closing time stays on the same day', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 17:00'), 60)), '2026-11-16 18:00');
});

test('ticket created after hours starts counting next morning', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 20:00'), 60)), '2026-11-17 10:00');
});

test('ticket created before opening time starts counting at 09:00', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 07:00'), 60)), '2026-11-16 10:00');
});

test('skips the weekend', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-20 17:00'), 120)), '2026-11-23 10:00');
});

test('ticket created on a Saturday starts counting on Monday', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-21 10:00'), 60)), '2026-11-23 10:00');
});

test('skips holidays', () => {
  const cal = buildCalendar([], ['2026-11-17']);
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 17:30'), 60, cal)), '2026-11-18 09:30');
});

test('Medium resolution: 3 business days (1620 min) from Mon 10:00 is Thu 10:00', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 10:00'), 1620)), '2026-11-19 10:00');
});

test('Low resolution: 5 business days (2700 min) from Mon 10:00 is next Mon 10:00', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 10:00'), 2700)), '2026-11-23 10:00');
});

test('24x7 calendar ignores nights and weekends (Critical tickets)', () => {
  const cal = twentyFourSevenCalendar();
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-21 23:00'), 240, cal)), '2026-11-22 03:00');
});

test('zero or negative minutes returns the start time', () => {
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-21 10:00'), 0)), '2026-11-21 10:00');
});

test('businessMinutesBetween: simple cases', () => {
  assert.equal(businessMinutesBetween(ist('2026-11-16 10:00'), ist('2026-11-16 11:30')), 90);
  assert.equal(businessMinutesBetween(ist('2026-11-20 17:00'), ist('2026-11-23 10:00')), 120);
});

test('businessMinutesBetween: nights, weekends and wrong order count as 0', () => {
  assert.equal(businessMinutesBetween(ist('2026-11-21 10:00'), ist('2026-11-22 10:00')), 0);
  assert.equal(businessMinutesBetween(ist('2026-11-16 19:00'), ist('2026-11-17 08:00')), 0);
  assert.equal(businessMinutesBetween(ist('2026-11-16 12:00'), ist('2026-11-16 10:00')), 0);
});

test('businessMinutesBetween skips holidays', () => {
  const cal = buildCalendar([], ['2026-11-17']);
  assert.equal(businessMinutesBetween(ist('2026-11-16 17:00'), ist('2026-11-18 10:00'), cal), 120);
});

test('businessMinutesBetween on a 24x7 calendar is plain elapsed time', () => {
  assert.equal(businessMinutesBetween(ist('2026-11-21 10:00'), ist('2026-11-21 12:00'), twentyFourSevenCalendar()), 120);
});

test('adding then measuring gives the same minutes back', () => {
  const starts = ['2026-11-16 10:00', '2026-11-16 20:00', '2026-11-20 17:45', '2026-11-21 09:00', '2026-11-22 23:59'];
  for (const s of starts) {
    for (const m of [1, 30, 95, 540, 1620, 2700]) {
      const due = addBusinessMinutes(ist(s), m);
      assert.equal(businessMinutesBetween(ist(s), due), m, `start ${s}, minutes ${m}`);
    }
  }
});

test('buildCalendar reads BUSINESS_HOURS rows and holidays', () => {
  const rows = [
    { day_of_week: 'Monday', start_time: '10:00:00', end_time: '17:00:00', is_working_day: 1 },
    { day_of_week: 'Tuesday', start_time: '10:00:00', end_time: '17:00:00', is_working_day: 1 },
    { day_of_week: 'Wednesday', start_time: '10:00:00', end_time: '17:00:00', is_working_day: 0 },
  ];
  const cal = buildCalendar(rows, ['2026-12-25']);
  assert.deepEqual(cal.days[1], { startMin: 600, endMin: 1020 });
  assert.equal(cal.days[3], null); // Wednesday is marked as a day off
  assert.equal(cal.days[5], null); // Friday has no row, so it is not a working day
  assert.ok(cal.holidays.has('2026-12-25'));
  // a Monday 09:00 start waits until the 10:00 opening
  assert.equal(fmt(addBusinessMinutes(ist('2026-11-16 09:00'), 30, cal)), '2026-11-16 10:30');
});

test('buildCalendar with an empty table falls back to Mon-Fri 09:00-18:00', () => {
  const cal = buildCalendar([], []);
  assert.deepEqual(cal.days[1], defaultCalendar().days[1]);
  assert.equal(cal.days[6], null);
});

test('a calendar with no working days throws instead of looping forever', () => {
  const cal = buildCalendar([{ day_of_week: 'Monday', start_time: '09:00:00', end_time: '18:00:00', is_working_day: 0 }]);
  assert.throws(() => addBusinessMinutes(ist('2026-11-16 10:00'), 60, cal), /No working time/);
});

test('istDateKey uses the India date, not the UTC date', () => {
  assert.equal(istDateKey(ist('2026-11-16 00:30')), '2026-11-16'); // 19:00 UTC on the 15th
  assert.equal(istDateKey(ist('2026-11-16 23:30')), '2026-11-16');
});