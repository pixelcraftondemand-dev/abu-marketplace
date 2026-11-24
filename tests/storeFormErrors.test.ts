import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeLogoFileProblem,
  describeLogoUploadFailure,
  describeMerchantFailure,
} from '../src/components/MerchantHubModal.tsx';
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

test('a refused submission never asks an already signed-in merchant to sign in', () => {
  const refused = `The marketplace could not verify this request, so we could not ${action}. Refresh the page and try again.`;

  assert.equal(describeMerchantFailure(new ApiError('Please sign in to apply for a store', 401), action), refused);
  // A missing token is thrown before any request is sent, so it has no status at all.
  assert.equal(describeMerchantFailure(new Error('Please sign in to continue'), action), refused);
  // A server message that happens to mention sign-in must not leak through either.
  const leaked = describeMerchantFailure(new ApiError('Please sign in to continue', 400), action);
  assert.doesNotMatch(leaked, /sign in/i);
  // 403 is "signed in but not permitted", so its reason still reaches the merchant.
  assert.equal(
    describeMerchantFailure(new ApiError('Admin access required', 403), action),
    'Admin access required',
  );
});

test('the logo upload reports on the file, never on signing in', () => {
  for (const error of [
    new ApiError('Please sign in to upload a store logo', 401),
    new ApiError('Admin access required', 403),
    new ApiError('Could not upload the logo. Please try again.', 502),
    new ApiError('Store logos must be 5 MB or smaller.', 413),
    new ApiError('Choose a valid JPEG, PNG, or WebP image.', 415),
    new TypeError('Failed to fetch'),
    new Error('Please sign in to continue'),
  ]) {
    const message = describeLogoUploadFailure(error);
    assert.ok(message.length > 0);
    assert.doesNotMatch(message, /sign in/i, `logo upload failure must not ask for sign-in: ${message}`);
    assert.doesNotMatch(message, /session/i, `logo upload failure must not mention the session: ${message}`);
  }
});

test('the logo upload names the reason a chosen file is refused', () => {
  // The handler only reads type and size, so a lightweight stand-in keeps the test fast.
  const file = (type: string, size: number) => ({ type, size }) as File;

  assert.equal(describeLogoFileProblem(file('image/png', 1024)), null);
  assert.equal(describeLogoFileProblem(file('image/webp', 4 * 1024 * 1024)), null);
  assert.equal(describeLogoFileProblem(file('image/gif', 1024)), 'Choose a JPEG, PNG, or WebP image.');
  assert.equal(describeLogoFileProblem(file('image/png', 0)), 'That image is empty. Choose a different file.');
  // A photo over the upload limit is accepted here because it is resized before sending.
  assert.equal(describeLogoFileProblem(file('image/jpeg', 8 * 1024 * 1024)), null);
  assert.equal(
    describeLogoFileProblem(file('image/jpeg', 26 * 1024 * 1024)),
    'That image is too large to process. Choose a photo under 25 MB.',
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

    const refused = describeMerchantFailure(new ApiError('Please sign in', 401), action);
    assert.doesNotMatch(refused, /sign in/i, `${label} refusal must not ask for sign-in`);
    assert.match(refused, new RegExp(`could not ${action}`, 'i'), `${label} refusal should name the action`);
  }
});
