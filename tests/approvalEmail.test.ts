import assert from 'node:assert/strict';
import test from 'node:test';
import { buildListingApprovalEmail, buildStoreApprovalEmail } from '../server/mailer.ts';
import { previewApprovalEmail, type SubmissionRow, type SubmissionStore } from '../server/storeSubmissions.ts';

/**
 * The admin can attach a note when approving, and the approval screen previews the email
 * that will be sent. These tests pin the contract that matters to the merchant: the note
 * must appear in both the HTML and plain-text bodies, escaped in HTML, and absent when the
 * admin left the field empty.
 */

const storeInput = {
  to: 'merchant@example.com',
  ownerName: 'Aminata Kamara',
  storeName: 'Kissy Electronics',
  storeId: 'store-abcdef12',
  storeSlug: 'kissy-electronics',
};

test('a store approval note appears in both the HTML and plain-text bodies', () => {
  const note = 'Payout verified — welcome aboard.';
  const email = buildStoreApprovalEmail({ ...storeInput, note });

  assert.match(email.subject, /Kissy Electronics/);
  assert.ok(email.html.includes(note), 'HTML body should contain the approval note');
  assert.ok(
    email.text.includes(`Note from the review team: ${note}`),
    'plain-text body should contain the approval note',
  );
  // The public storefront address is in both bodies too, so the note is not the only link.
  assert.ok(email.html.includes('/stores/kissy-electronics'));
  assert.ok(email.text.includes('/stores/kissy-electronics'));
});

test('a note with markup is escaped in HTML but kept verbatim in the text body', () => {
  const note = '<b>Approved</b> & ready';
  const email = buildStoreApprovalEmail({ ...storeInput, note });

  assert.ok(!email.html.includes('<b>Approved</b>'), 'raw markup must not reach the HTML body');
  assert.ok(email.html.includes('&lt;b&gt;Approved&lt;/b&gt; &amp; ready'));
  assert.ok(email.text.includes(note), 'the plain-text body is not HTML and keeps the note as written');
});

test('an empty note adds no note section to either body', () => {
  const email = buildStoreApprovalEmail({ ...storeInput, note: '   ' });

  assert.ok(!email.html.includes('Note from the review team'));
  assert.ok(!email.text.includes('Note from the review team'));
});

test('the approval email preview carries the note in both HTML and plain text', async () => {
  const pending: SubmissionRow = {
    id: '11111111-2222-3333-4444-555555555555',
    kind: 'store',
    payload: null,
    owner_id: 'user_merchant',
    owner_email: 'merchant@example.com',
    owner_name: 'Aminata Kamara',
    name: 'Kissy Electronics',
    slug: 'kissy-electronics',
    tagline: 'Trusted electronics in Freetown',
    description: 'Phones, accessories, and repairs.',
    location_hub: 'Freetown Central',
    province: 'Western Area',
    street_address: '12 Kissy Road',
    phone: '+232 76 123456',
    payout_provider: 'orange',
    payout_phone: '+232 76 123456',
    logo: 'https://cdn.example.com/kissy-logo.png',
    status: 'pending',
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    created_store_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // The preview only reads the pending row, so a finder is the whole database it needs.
  const store = {
    find: async () => ({ data: pending, error: null }),
  } as unknown as SubmissionStore;

  const note = 'Please confirm your payout number.';
  const preview = await previewApprovalEmail(pending.id, note, { store });

  assert.ok(preview.html.includes(note), 'preview HTML should contain the note');
  assert.ok(
    preview.text.includes(`Note from the review team: ${note}`),
    'preview plain text should contain the note',
  );
  assert.ok(preview.html.includes('/stores/kissy-electronics'));
  assert.ok(preview.text.includes('/stores/kissy-electronics'));
});

test('a listing approval note appears in both bodies', () => {
  const note = 'Serial number confirmed.';
  const email = buildListingApprovalEmail({
    to: 'merchant@example.com',
    ownerName: 'Aminata Kamara',
    itemName: '300W Solar Inverter',
    kind: 'product',
    note,
  });

  assert.ok(email.html.includes(note), 'HTML body should contain the approval note');
  assert.ok(
    email.text.includes(`Note from the review team: ${note}`),
    'plain-text body should contain the approval note',
  );
});
