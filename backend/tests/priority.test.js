// backend/tests/priority.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { derivePriority, isValidPriority } = require('../utils/priority');

test('impact x urgency matrix gives the expected priority for all 9 combinations', () => {
  const expected = {
    'High/High': 'Critical', 'High/Medium': 'High', 'High/Low': 'Medium',
    'Medium/High': 'High', 'Medium/Medium': 'Medium', 'Medium/Low': 'Low',
    'Low/High': 'Medium', 'Low/Medium': 'Low', 'Low/Low': 'Low',
  };
  for (const [key, priority] of Object.entries(expected)) {
    const [impact, urgency] = key.split('/');
    assert.equal(derivePriority(impact, urgency), priority, key);
  }
});

test('unknown or missing impact / urgency is rejected', () => {
  assert.throws(() => derivePriority('Huge', 'High'), /impact and urgency/);
  assert.throws(() => derivePriority('High'), /impact and urgency/);
});

test('isValidPriority accepts only the four SRS priorities', () => {
  for (const p of ['Low', 'Medium', 'High', 'Critical']) assert.equal(isValidPriority(p), true);
  assert.equal(isValidPriority('Urgent'), false);
  assert.equal(isValidPriority(undefined), false);
});