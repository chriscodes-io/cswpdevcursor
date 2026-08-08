import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileHubSpotCreateAttempt } from './contacts.js';

test('successful create with id is accepted as new contact', () => {
  const result = reconcileHubSpotCreateAttempt({
    createdId: '99',
    createError: null,
    recoveredId: null,
  });
  assert.deepEqual(result, { ok: true, contactId: '99', isNew: true });
});

test('ambiguous create failure recovers existing contact without re-POST', () => {
  const result = reconcileHubSpotCreateAttempt({
    createdId: undefined,
    createError: new Error('Pica API 502 Bad Gateway'),
    recoveredId: '42',
  });
  assert.deepEqual(result, { ok: true, contactId: '42', isNew: false });
});

test('create response missing id recovers via search when contact landed', () => {
  const result = reconcileHubSpotCreateAttempt({
    createdId: '',
    createError: null,
    recoveredId: '7',
  });
  assert.deepEqual(result, { ok: true, contactId: '7', isNew: false });
});

test('create failure with no recoverable contact surfaces the error', () => {
  const err = new Error('timeout');
  const result = reconcileHubSpotCreateAttempt({
    createdId: undefined,
    createError: err,
    recoveredId: null,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, err);
  }
});
