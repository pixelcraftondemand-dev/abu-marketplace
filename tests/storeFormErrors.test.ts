import assert from 'node:assert/strict';
import test from 'node:test';
import { describeMerchantFailure } from '../src/components/MerchantHubModal.tsx';
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
  assert.equal(
    describeMerchantFailure(new ApiError('Admin access required', 403), action),
    `Please sign in again to ${action}.`,
  );
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
