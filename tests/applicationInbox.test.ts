import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApplicationInbox } from '../src/lib/applicationInbox.ts';
import type { StoreSubmission } from '../src/services/api.ts';

const application = (overrides: Partial<StoreSubmission> = {}): StoreSubmission => ({
  id: 'app-1',
  kind: 'store',
  payload: null,
  owner_id: 'user-1',
  owner_email: 'merchant@example.com',
  owner_name: 'Merchant',
  name: 'Kissy Electronics',
  slug: 'kissy-electronics',
  tagline: null,
  description: null,
  location_hub: null,
  province: null,
  street_address: null,
  phone: '+23276000000',
  payout_provider: null,
  payout_phone: null,
  logo: null,
  status: 'pending',
  review_note: null,
  reviewed_by: null,
  reviewed_at: null,
  created_store_id: null,
  created_at: '2026-11-20T10:00:00.000Z',
  updated_at: '2026-11-20T10:00:00.000Z',
  ...overrides,
});

test('a pending application has an unread receipt and no decision message', () => {
  const messages = buildApplicationInbox([application()], {});
  assert.equal(messages.length, 1);
  assert.equal(messages[0].title, 'Application received');
  assert.equal(messages[0].unread, true);
});

test('an approved application adds a readable decision with the review note', () => {
  const messages = buildApplicationInbox(
    [
      application({
        status: 'approved',
        reviewed_at: '2026-11-21T09:00:00.000Z',
        updated_at: '2026-11-21T09:00:00.000Z',
        review_note: 'Great catalogue. Welcome aboard.',
      }),
    ],
    {},
  );

  const decision = messages.find((message) => message.title === 'Application approved');
  assert.ok(decision);
  assert.match(decision.body, /now live in the marketplace/);
  assert.match(decision.body, /Great catalogue\. Welcome aboard\./);
  assert.equal(messages[0].title, 'Application approved');
});

test('a rejection carries the reason and invites a new application', () => {
  const messages = buildApplicationInbox(
    [
      application({
        status: 'rejected',
        reviewed_at: '2026-11-21T09:00:00.000Z',
        updated_at: '2026-11-21T09:00:00.000Z',
        review_note: 'Business registration is missing.',
      }),
    ],
    {},
  );

  const decision = messages.find((message) => message.title === 'Application rejected');
  assert.ok(decision);
  assert.match(decision.body, /Reason: Business registration is missing\./);
  assert.match(decision.body, /submit a new application/);
});

test('read ids clear the unread badge without dropping the message', () => {
  const pending = application();
  const first = buildApplicationInbox([pending], {});
  const readIds = { [first[0].id]: true as const };
  const second = buildApplicationInbox([pending], readIds);

  assert.equal(second.length, 1);
  assert.equal(second[0].unread, false);
});

test('editing an approved note produces a fresh unread decision message', () => {
  const approved = application({
    status: 'approved',
    reviewed_at: '2026-11-21T09:00:00.000Z',
    updated_at: '2026-11-21T09:00:00.000Z',
    review_note: null,
  });
  const before = buildApplicationInbox([approved], {});
  const readIds = Object.fromEntries(before.map((message) => [message.id, true as const]));

  const edited = { ...approved, review_note: 'Please add your Tin number.', updated_at: '2026-11-21T10:00:00.000Z' };
  const after = buildApplicationInbox([edited], readIds);
  const decision = after.find((message) => message.title === 'Application approved');

  assert.ok(decision);
  assert.equal(decision.unread, true);
  assert.match(decision.body, /Tin number/);
});
