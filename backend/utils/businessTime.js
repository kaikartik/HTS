// backend/utils/businessTime.js
// Pure date maths for SLA clocks. No database and no extra packages.
// Business time is always worked out in IST (Asia/Kolkata = UTC+05:30, no daylight saving).
// A "calendar" is a plain object, so everything here is easy to unit-test.

const IST_OFFSET_MS = 330 * 60 * 1000; // +05:30
const MIN_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MIN_MS;
const MAX_DAYS_SCAN = 366; // safety stop if a calendar has no working days

const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function toMs(value) {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(ms)) throw new TypeError(`Invalid date: ${value}`);
  return ms;
}

// Midnight (00:00 IST) of the IST day that contains this instant.
function istMidnightMs(ms) {
  return Math.floor((ms + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

// 'YYYY-MM-DD' of the IST day that contains this instant.
function istDateKey(value) {
  return new Date(istMidnightMs(toMs(value)) + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// Mon-Fri 09:00-18:00 IST, no holidays. Day numbers: 0 = Sunday ... 6 = Saturday.
function defaultCalendar() {
  const workDay = { startMin: 9 * 60, endMin: 18 * 60 };
  return {
    is24x7: false,
    days: { 0: null, 1: workDay, 2: workDay, 3: workDay, 4: workDay, 5: workDay, 6: null },
    holidays: new Set(),
  };
}

// Used for Critical tickets (the SRS says Critical runs 24x7).
function twentyFourSevenCalendar() {
  return { is24x7: true, days: {}, holidays: new Set() };
}

// '09:00:00' -> 540
function timeToMinutes(value) {
  const [h = 0, m = 0] = String(value).split(':').map(Number);
  return h * 60 + m;
}

// Build a calendar from BUSINESS_HOURS rows and a list of 'YYYY-MM-DD' holiday strings.
// Row example: { day_of_week: 'Monday', start_time: '09:00:00', end_time: '18:00:00', is_working_day: 1 }
// An empty table falls back to the default calendar so SLA maths never breaks.
function buildCalendar(hoursRows = [], holidayDates = []) {
  const cal = defaultCalendar();
  if (hoursRows.length > 0) {
    cal.days = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
    for (const row of hoursRows) {
      const idx = DAY_INDEX[String(row.day_of_week).trim().slice(0, 3).toLowerCase()];
      if (idx === undefined) continue;
      if (Number(row.is_working_day) === 1 || row.is_working_day === true) {
        cal.days[idx] = { startMin: timeToMinutes(row.start_time), endMin: timeToMinutes(row.end_time) };
      }
    }
  }
  cal.holidays = new Set(holidayDates);
  return cal;
}

// Working window (in ms) of one IST day, or null when it is a weekend / holiday.
function windowForDay(cal, dayStartMs) {
  const key = new Date(dayStartMs + IST_OFFSET_MS).toISOString().slice(0, 10);
  if (cal.holidays.has(key)) return null;
  const rule = cal.days[new Date(dayStartMs + IST_OFFSET_MS).getUTCDay()];
  if (!rule) return null;
  return { startMs: dayStartMs + rule.startMin * MIN_MS, endMs: dayStartMs + rule.endMin * MIN_MS };
}

// The moment when `minutes` of business time have passed since `start`.
function addBusinessMinutes(start, minutes, cal = defaultCalendar()) {
  const startMs = toMs(start);
  if (!(minutes > 0)) return new Date(startMs);
  if (cal.is24x7) return new Date(startMs + minutes * MIN_MS);

  let remainingMs = minutes * MIN_MS;
  let dayStart = istMidnightMs(startMs);
  for (let i = 0; i < MAX_DAYS_SCAN; i++, dayStart += DAY_MS) {
    const w = windowForDay(cal, dayStart);
    if (!w || startMs >= w.endMs) continue;
    const from = Math.max(startMs, w.startMs);
    const available = w.endMs - from;
    if (remainingMs <= available) return new Date(from + remainingMs);
    remainingMs -= available;
  }
  throw new Error('No working time found in the next 366 days - check business hours and holidays.');
}

// How many business minutes lie between two moments (0 if end is not after start).
function businessMinutesBetween(start, end, cal = defaultCalendar()) {
  const aMs = toMs(start);
  const bMs = toMs(end);
  if (!(bMs > aMs)) return 0;
  if (cal.is24x7) return (bMs - aMs) / MIN_MS;

  let totalMs = 0;
  const lastDayStart = istMidnightMs(bMs);
  for (let dayStart = istMidnightMs(aMs); dayStart <= lastDayStart; dayStart += DAY_MS) {
    const w = windowForDay(cal, dayStart);
    if (!w) continue;
    const from = Math.max(aMs, w.startMs);
    const to = Math.min(bMs, w.endMs);
    if (to > from) totalMs += to - from;
  }
  return totalMs / MIN_MS;
}

module.exports = {
  defaultCalendar,
  twentyFourSevenCalendar,
  buildCalendar,
  addBusinessMinutes,
  businessMinutesBetween,
  istDateKey,
};