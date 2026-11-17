// backend/tests/assignment.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseAgent } = require('../services/assignmentService');

const agent = (user_id, open_count, last_assigned_at = null) => ({ user_id, open_count, last_assigned_at });

test('an empty team gives nobody', () => {
  assert.equal(chooseAgent([]), null);
  assert.equal(chooseAgent(null), null);
});

test('the agent with the fewest open tickets wins', () => {
  assert.equal(chooseAgent([agent(6, 3), agent(7, 1), agent(8, 2)]).user_id, 7);
});

test('on a tie, the agent assigned longest ago wins (round-robin)', () => {
  const picked = chooseAgent([
    agent(6, 1, '2026-11-17T10:00:05+05:30'),
    agent(7, 1, '2026-11-17T10:00:01+05:30'),
  ]);
  assert.equal(picked.user_id, 7);
});

test('an agent who was never assigned goes before agents who were', () => {
  assert.equal(chooseAgent([agent(6, 0, '2026-11-17T10:00:01+05:30'), agent(7, 0, null)]).user_id, 7);
});

test('a full tie falls back to the lowest user id', () => {
  assert.equal(chooseAgent([agent(9, 0), agent(7, 0), agent(8, 0)]).user_id, 7);
});

test('round-robin over 4 new tickets alternates between two idle agents', () => {
  const agents = [agent(6, 0), agent(7, 0)];
  let clock = 1;
  const order = [];
  for (let i = 0; i < 4; i++) {
    const picked = chooseAgent(agents);
    order.push(picked.user_id);
    picked.open_count += 1;
    picked.last_assigned_at = new Date(2026, 10, 17, 10, 0, clock++).toISOString();
  }
  assert.deepEqual(order, [6, 7, 6, 7]);
});

test('chooseAgent does not change the list it is given', () => {
  const list = [agent(8, 2), agent(7, 1)];
  chooseAgent(list);
  assert.deepEqual(list.map((a) => a.user_id), [8, 7]);
});