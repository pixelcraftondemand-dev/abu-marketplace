import assert from 'node:assert/strict';
import test from 'node:test';
import { describeMerchantFailure, isSessionRejected } from '../src/components/MerchantHubModal.tsx';
import { ApiError } from '../src/services/api.ts';

const action = 'submit your store application';
const temporary =
  'The marketplace is temporarily unavailable, so we could not submit your store application. Please try again in a moment.';

test('a 500 from the submissions endpoint reads as a temporary problem, not a sign-in prompt', () => {
  const message = describeMerchantFailure(
    new ApiError('Could not save your application: duplicate key value', 500),
    action,
  );

  assert.equal(message, temporary);
  assert.doesNotMatch(message, /sign in/i);
  assert.doesNotMatch(message, /duplicate key value/);
});

test('gateway and service-availability failures also read as temporary', () => {
  for (const status of [502, 503, 504]) {
    assert.equal(describeMerchantFailure(new ApiError('Something went wrong. Please try again.', status), action), temporary);
  }
});

test('a network failure with no HTTP status reads as temporary', () => {
  assert.equal(describeMerchantFailure(new TypeError('Failed to fetch'), action), temporary);
  assert.equal(describeMerchantFailure(new Error(''), action), temporary);
});

test('an expired session is the only failure that asks for sign-in', () => {
  assert.equal(
    describeMerchantFailure(new ApiError('Please sign in to apply for a store', 401), action),
    `Please sign in again to ${action}.`,
  );
  // 403 is "signed in but not permitted", so it must not claim the session is gone.
  assert.equal(
    describeMerchantFailure(new ApiError('Admin access required', 403), action),
    'Admin access required',
  );
});

test('only a rejected session offers the re-sign-in action', () => {
  assert.equal(isSessionRejected(new ApiError('Please sign in to upload a store logo', 401)), true);
  // The client raises this when no token can be minted at all, with no HTTP status.
  assert.equal(isSessionRejected(new Error('Please sign in to continue')), true);
  // Signed in but not allowed, outages, and local validation must not offer re-sign-in.
  assert.equal(isSessionRejected(new ApiError('Admin access required', 403)), false);
  assert.equal(isSessionRejected(new ApiError('Could not upload the logo. Please try again.', 502)), false);
  assert.equal(isSessionRejected(new TypeError('Failed to fetch')), false);
  assert.equal(isSessionRejected(new Error('Store logos must be 5 MB or smaller.')), false);
});

test('validation and duplicate-application messages reach the merchant unchanged', () => {
  const duplicate = 'You already have a pending application for "E2E Store". Please wait for a decision.';
  assert.equal(describeMerchantFailure(new ApiError(duplicate, 409), action), duplicate);
  assert.equal(
    describeMerchantFailure(new ApiError('That phone number does not look valid', 400), action),
    'That phone number does not look valid',
  );
});

test('the single-item and service forms get the same non-auth wording', () => {
  for (const [action, label] of [
    ['list this item', 'single item'],
    ['register this service', 'service'],
  ] as const) {
    const outage = describeMerchantFailure(new ApiError('Something went wrong. Please try again.', 500), action);
    assert.equal(outage, `The marketplace is temporarily unavailable, so we could not ${action}. Please try again in a moment.`);
    assert.doesNotMatch(outage, /sign in/i, `${label} outage must not ask for sign-in`);

    assert.equal(
      describeMerchantFailure(new ApiError('Please sign in', 401), action),
      `Please sign in again to ${action}.`,
      `${label} auth failure should still ask for sign-in`,
    );
  }
});
