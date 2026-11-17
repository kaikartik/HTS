// backend/utils/priority.js
// Priority comes from impact x urgency (SRS FR-14). This is the standard 3x3 matrix.

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

//              urgency:  High         Medium       Low
const MATRIX = {
  High:   { High: 'Critical', Medium: 'High',   Low: 'Medium' }, // impact High
  Medium: { High: 'High',     Medium: 'Medium', Low: 'Low' },    // impact Medium
  Low:    { High: 'Medium',   Medium: 'Low',    Low: 'Low' },    // impact Low
};

function derivePriority(impact, urgency) {
  const priority = MATRIX[impact] && MATRIX[impact][urgency];
  if (!priority) throw new Error('impact and urgency must each be Low, Medium or High.');
  return priority;
}

function isValidPriority(priority) {
  return PRIORITIES.includes(priority);
}

module.exports = { PRIORITIES, derivePriority, isValidPriority };