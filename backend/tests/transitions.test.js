// backend/tests/transitions.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { STATUSES, checkTransition, allowedTransitions } = require('../utils/transitions');

const DAY = 24 * 60 * 60 * 1000;
const agent = { user_id: 6, role_name: 'Agent' };
const otherAgent = { user_id: 7, role_name: 'Agent' };
const requester = { user_id: 4, role_name: 'Requester' };
const otherRequester = { user_id: 5, role_name: 'Requester' };
const supervisor = { user_id: 3, role_name: 'Supervisor' };
const admin = { user_id: 2, role_name: 'Admin' };
const system = { user_id: 1, role_name: 'System' };

// agent 6 works on this ticket, requester 4 raised it
const ticket = (status, extra = {}) => ({ status, assignee_id: 6, requester_id: 4, resolved_at: null, ...extra });
const ok = (t, to, actor, now) => checkTransition(t, to, actor, now).ok;

test('the 7 statuses of the SRS', () => {
  assert.deepEqual(STATUSES, ['New', 'Open', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Reopened']);
});

test('every step of the SRS life cycle works for the right person', () => {
  assert.ok(ok(ticket('New'), 'Open', supervisor));
  assert.ok(ok(ticket('Open'), 'In Progress', agent));
  assert.ok(ok(ticket('In Progress'), 'On Hold', agent));
  assert.ok(ok(ticket('On Hold'), 'In Progress', agent));
  assert.ok(ok(ticket('In Progress'), 'Resolved', agent));
  assert.ok(ok(ticket('Resolved'), 'Closed', requester));
  assert.ok(ok(ticket('Resolved'), 'Reopened', requester));
  assert.ok(ok(ticket('Reopened'), 'In Progress', agent));
});

test('steps that are not in the state diagram are refused with 409', () => {
  const refused = [
    ['New', 'In Progress'], ['Open', 'Resolved'], ['Open', 'On Hold'], ['In Progress', 'Closed'],
    ['In Progress', 'Open'], ['Resolved', 'In Progress'], ['On Hold', 'Resolved'],
  ];
  for (const [from, to] of refused) {
    const result = checkTransition(ticket(from), to, supervisor);
    assert.equal(result.ok, false, `${from} -> ${to}`);
    assert.equal(result.status, 409, `${from} -> ${to}`);
  }
  for (const to of STATUSES) {
    assert.equal(checkTransition(ticket('Closed'), to, admin).status, 409, `Closed -> ${to}`);
  }
});

test('an unknown status is a 400', () => {
  assert.equal(checkTransition(ticket('Open'), 'Done', agent).status, 400);
});

test('a requester cannot work on a ticket and an agent cannot close or reopen one', () => {
  assert.equal(checkTransition(ticket('Open'), 'In Progress', requester).status, 403);
  assert.equal(checkTransition(ticket('In Progress'), 'Resolved', requester).status, 403);
  assert.equal(checkTransition(ticket('Resolved'), 'Closed', agent).status, 403);
  assert.equal(checkTransition(ticket('Resolved'), 'Reopened', agent).status, 403);
});

test('an agent only acts on their own tickets, a supervisor or admin on any', () => {
  assert.equal(checkTransition(ticket('In Progress'), 'On Hold', otherAgent).status, 403);
  assert.ok(ok(ticket('In Progress'), 'On Hold', supervisor));
  assert.ok(ok(ticket('In Progress'), 'On Hold', admin));
});

test('a requester only acts on their own ticket', () => {
  assert.equal(checkTransition(ticket('Resolved'), 'Closed', otherRequester).status, 403);
  assert.equal(checkTransition(ticket('Resolved'), 'Reopened', otherRequester).status, 403);
});

test('the requester can send an On Hold ticket back to work (information received)', () => {
  assert.ok(ok(ticket('On Hold'), 'In Progress', requester));
  assert.equal(checkTransition(ticket('On Hold'), 'In Progress', otherRequester).status, 403);
});

test('the System user can resume On Hold tickets and close Resolved ones (7-day auto-close)', () => {
  assert.ok(ok(ticket('On Hold'), 'In Progress', system));
  assert.ok(ok(ticket('Resolved'), 'Closed', system));
  assert.equal(checkTransition(ticket('Open'), 'In Progress', system).status, 403);
});

test('a ticket without an agent cannot become Open', () => {
  const result = checkTransition(ticket('New', { assignee_id: null }), 'Open', supervisor);
  assert.equal(result.status, 409);
  assert.match(result.error, /Assign the ticket/);
});

test('a resolved ticket can be reopened for 7 days', () => {
  const now = new Date('2026-11-24T10:00:00Z');
  const resolvedAt = (ms) => new Date(now.getTime() - ms);
  assert.ok(ok(ticket('Resolved', { resolved_at: resolvedAt(7 * DAY) }), 'Reopened', requester, now));
  const late = checkTransition(ticket('Resolved', { resolved_at: resolvedAt(7 * DAY + 60000) }), 'Reopened', requester, now);
  assert.equal(late.status, 409);
  assert.match(late.error, /reopen window/);
  // closing is still possible after 7 days
  assert.ok(ok(ticket('Resolved', { resolved_at: resolvedAt(9 * DAY) }), 'Closed', requester, now));
});

test('allowedTransitions lists only what this person may do (for the buttons)', () => {
  assert.deepEqual(allowedTransitions(ticket('Open'), agent), ['In Progress']);
  assert.deepEqual(allowedTransitions(ticket('Open'), requester), []);
  assert.deepEqual(allowedTransitions(ticket('Open'), otherAgent), []);
  assert.deepEqual(allowedTransitions(ticket('In Progress'), agent), ['On Hold', 'Resolved']);
  assert.deepEqual(allowedTransitions(ticket('Resolved'), requester), ['Closed', 'Reopened']);
  assert.deepEqual(allowedTransitions(ticket('Resolved'), agent), []);
  assert.deepEqual(allowedTransitions(ticket('On Hold'), requester), ['In Progress']);
  assert.deepEqual(allowedTransitions(ticket('Closed'), admin), []);
});