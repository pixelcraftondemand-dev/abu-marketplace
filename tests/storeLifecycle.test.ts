import assert from 'node:assert/strict';
import test from 'node:test';
import {
  approveSubmission,
  approvedListings,
  approvedStores,
  createListingSubmission,
  createSubmission,
  invalidateApprovedCache,
  listSubmissions,
  previewApprovalEmail,
  rejectSubmission,
  SubmissionError,
  updateApprovalNote,
  type Actor,
  type SubmissionDecision,
  type SubmissionInsert,
  type SubmissionMailer,
  type SubmissionRow,
  type SubmissionSeams,
  type SubmissionStore,
} from '../server/storeSubmissions.ts';
import type { Product } from '../src/types';

/**
 * Integration coverage for the whole review queue: a merchant submits, the application
 * is pending (and not public), an admin approves or rejects it, and only the approved
 * decision reaches the public catalog. The store and mailer are in-memory, so the test
 * exercises the real lifecycle functions end-to-end without touching Supabase or sending
 * email, and every test starts from an empty queue.
 */

class MemorySubmissionStore implements SubmissionStore {
  readonly rows: SubmissionRow[] = [];
  private nextId = 1;

  async insert(row: SubmissionInsert) {
    const saved: SubmissionRow = {
      ...row,
      id: row.id ?? `sub-${this.nextId++}`,
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
      created_store_id: null,
    };
    this.rows.push(saved);
    return { data: { ...saved }, error: null };
  }

  async find(id: string) {
    const row = this.rows.find((candidate) => candidate.id === id);
    return { data: row ? { ...row } : null, error: null };
  }

  async listPendingForOwner(ownerId: string) {
    return {
      data: this.rows
        .filter((row) => row.owner_id === ownerId && row.status === 'pending')
        .map(({ id, name, status }) => ({ id, name, status })),
      error: null,
    };
  }

  async list(status?: SubmissionRow['status']) {
    return {
      data: this.rows
        .filter((row) => !status || row.status === status)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((row) => ({ ...row })),
      error: null,
    };
  }

  async decide(id: string, decision: SubmissionDecision) {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row) return { data: null, error: 'not found' };
    if (row.status !== 'pending') return { data: null, error: `already ${row.status}` };
    const decided: SubmissionRow = { ...row, ...decision };
    Object.assign(row, decided);
    return { data: { ...decided }, error: null };
  }

  async listApproved(kind: SubmissionRow['kind']) {
    return {
      data: this.rows
        .filter((row) => row.kind === kind && row.status === 'approved')
        .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''))
        .map((row) => ({ ...row })),
      error: null,
    };
  }

  async updateNote(id: string, note: string | null) {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row) return { data: null, error: 'not found' };
    if (row.status !== 'approved') return { data: null, error: 'not approved' };
    row.review_note = note;
    row.updated_at = new Date().toISOString();
    return { data: { ...row }, error: null };
  }
}

type MailCall = {
  kind: string;
  to: string;
  name: string;
  note?: string;
  storeId?: string;
  slug?: string | null;
};

const makeMailer = () => {
  const calls: MailCall[] = [];
  const mailer: SubmissionMailer = {
    storeSubmitted: async ({ to, storeName }) => {
      calls.push({ kind: 'store_submitted', to, name: storeName });
      return { status: 'sent' };
    },
    storeApproved: async ({ to, storeName, storeId, storeSlug, note }) => {
      calls.push({ kind: 'store_approved', to, name: storeName, storeId, slug: storeSlug, note });
      return { status: 'sent' };
    },
    storeRejected: async ({ to, storeName, note }) => {
      calls.push({ kind: 'store_rejected', to, name: storeName, note });
      return { status: 'sent' };
    },
    listingSubmitted: async ({ to, itemName }) => {
      calls.push({ kind: 'listing_submitted', to, name: itemName });
      return { status: 'sent' };
    },
    listingApproved: async ({ to, itemName, note }) => {
      calls.push({ kind: 'listing_approved', to, name: itemName, note });
      return { status: 'sent' };
    },
    listingRejected: async ({ to, itemName, note }) => {
      calls.push({ kind: 'listing_rejected', to, name: itemName, note });
      return { status: 'sent' };
    },
  };
  return { calls, mailer };
};

const merchant: Actor = {
  id: 'user_merchant',
  email: 'merchant@example.com',
  name: 'Aminata Kamara',
  role: 'merchant',
};
const admin: Actor = { id: 'user_admin', email: 'operator@example.com', role: 'admin' };
const secondAdmin: Actor = { id: 'user_admin_2', email: 'operator2@example.com', role: 'admin' };

const setup = (): { store: MemorySubmissionStore; seams: SubmissionSeams; calls: MailCall[] } => {
  const store = new MemorySubmissionStore();
  const { calls, mailer } = makeMailer();
  // Approved reads are cached for the process, so a fresh lifecycle must start cold.
  invalidateApprovedCache();
  return { store, seams: { store, mailer }, calls };
};

const storeApplication = (name: string) => ({
  name,
  phone: '+232 76 123456',
  tagline: 'Trusted electronics in Freetown',
  description: 'Phones, accessories, and repairs with a two-week guarantee.',
  locationHub: 'Freetown Central',
  province: 'Western Area',
  streetAddress: '12 Kissy Road',
  logo: 'https://cdn.example.com/kissy-logo.png',
});

test('a store application moves from pending to public in one approval', async () => {
  const { seams, calls } = setup();

  const created = await createSubmission(storeApplication('Kissy Electronics'), merchant, seams);
  assert.equal(created.submission.status, 'pending');
  assert.equal(created.submission.owner_id, merchant.id);
  assert.equal(created.mail.status, 'sent');
  assert.deepEqual(calls.map((call) => call.kind), ['store_submitted']);

  // The admin queue sees it and the merchant list sees it, but the public catalog does not.
  const pending = await listSubmissions('pending', seams);
  assert.deepEqual(pending.map((row) => row.name), ['Kissy Electronics']);
  assert.equal((await approvedStores(seams)).length, 0);

  const approved = await approveSubmission(created.submission.id, admin, 'Verified storefront', seams);
  assert.equal(approved.submission.status, 'approved');
  assert.equal(approved.submission.created_store_id, `store-${created.submission.id.slice(0, 8)}`);
  assert.equal(approved.submission.reviewed_by, admin.id);
  assert.equal(approved.submission.review_note, 'Verified storefront');
  assert.equal(approved.mail.status, 'sent');

  // Approval invalidated the empty cache, so the store is visible on the next read.
  const publicStores = await approvedStores(seams);
  assert.equal(publicStores.length, 1);
  assert.equal(publicStores[0].name, 'Kissy Electronics');
  assert.equal(publicStores[0].isVerified, true);

  assert.equal((await listSubmissions('pending', seams)).length, 0);
  assert.equal((await listSubmissions('approved', seams)).length, 1);

  // The merchant-facing query filters all submissions by owner, as /mine does.
  const mine = (await listSubmissions(undefined, seams)).filter((row) => row.owner_id === merchant.id);
  assert.equal(mine[0].status, 'approved');
  assert.deepEqual(approvedMail(calls), [
    {
      kind: 'store_approved',
      to: merchant.email,
      name: 'Kissy Electronics',
      storeId: `store-${created.submission.id.slice(0, 8)}`,
      // The email links straight to the store's public address.
      slug: 'kissy-electronics',
      // The admin's approval note travels with the email as well as the in-app record.
      note: 'Verified storefront',
    },
  ]);
});

test('a reviewed application cannot be approved a second time', async () => {
  const { seams } = setup();
  const created = await createSubmission(storeApplication('Lumley Auto Parts'), merchant, seams);

  await approveSubmission(created.submission.id, admin, undefined, seams);
  await assert.rejects(
    () => approveSubmission(created.submission.id, admin, undefined, seams),
    (error: unknown) => error instanceof SubmissionError && error.code === 'ALREADY_REVIEWED' && error.status === 409,
  );
});

test('two admins approving the same application at once produce one decision', async () => {
  const { seams, calls } = setup();
  const created = await createSubmission(storeApplication('Waterloo Hardware'), merchant, seams);

  // Both reviewers read the pending row before either decision is written, so only the
  // conditional update can decide the winner.
  const results = await Promise.allSettled([
    approveSubmission(created.submission.id, admin, 'Approved by the first reviewer', seams),
    approveSubmission(created.submission.id, secondAdmin, 'Approved by the second reviewer', seams),
  ]);

  const winner = results.find((result) => result.status === 'fulfilled');
  const loser = results.find((result) => result.status === 'rejected');
  assert.ok(winner && winner.status === 'fulfilled');
  assert.ok(loser && loser.status === 'rejected');
  assert.ok(loser.reason instanceof SubmissionError);
  assert.equal(loser.reason.code, 'ALREADY_REVIEWED');
  assert.equal(loser.reason.status, 409);

  const stored = (await listSubmissions(undefined, seams))[0];
  assert.equal(stored.status, 'approved');
  assert.equal(stored.reviewed_by, winner.value.submission.reviewed_by);
  assert.equal(stored.review_note, winner.value.submission.review_note);
  assert.ok([admin.id, secondAdmin.id].includes(stored.reviewed_by!));

  // The losing review must not publish a second store or send a second approval email.
  assert.equal(calls.filter((call) => call.kind === 'store_approved').length, 1);
  assert.equal((await approvedStores(seams)).length, 1);
});

test('a rejection needs a reason, keeps the row pending on failure, and never publishes', async () => {
  const { seams, calls } = setup();
  const created = await createSubmission(storeApplication('Bo Textiles'), merchant, seams);

  await assert.rejects(
    () => rejectSubmission(created.submission.id, admin, '   ', seams),
    (error: unknown) => error instanceof SubmissionError && error.code === 'MISSING_REASON' && error.status === 400,
  );
  assert.equal((await listSubmissions(undefined, seams))[0].status, 'pending');

  const rejected = await rejectSubmission(created.submission.id, admin, 'Street address is incomplete', seams);
  assert.equal(rejected.submission.status, 'rejected');
  assert.equal(rejected.submission.review_note, 'Street address is incomplete');
  assert.equal(rejected.submission.reviewed_by, admin.id);
  assert.equal((await approvedStores(seams)).length, 0);

  const rejectionMail = calls.find((call) => call.kind === 'store_rejected');
  assert.equal(rejectionMail?.note, 'Street address is incomplete');
  assert.equal(rejectionMail?.to, merchant.email);
});

test('one pending application per store name and owner, but a second owner may apply', async () => {
  const { seams } = setup();
  await createSubmission(storeApplication('Makeni Solar'), merchant, seams);

  await assert.rejects(
    () => createSubmission(storeApplication('makeni solar'), merchant, seams),
    (error: unknown) => error instanceof SubmissionError && error.code === 'ALREADY_PENDING' && error.status === 409,
  );

  const otherMerchant: Actor = { id: 'user_other', email: 'other@example.com', name: 'Other Seller' };
  const second = await createSubmission(storeApplication('Makeni Solar'), otherMerchant, seams);
  assert.equal(second.submission.status, 'pending');
});

test('listing submissions use the same review flow and publish their payload on approval', async () => {
  const { seams, calls } = setup();
  const product: Product = {
    id: 'prod-solar-001',
    title: '300W Solar Inverter',
    category: 'Solar & Power',
    priceSLE: 2400,
    originalPriceSLE: 2900,
    rating: 4.8,
    reviewCount: 0,
    soldCount: 0,
    stockCount: 3,
    image: 'https://cdn.example.com/inverter.jpg',
    sellerName: merchant.name!,
    sellerLocation: 'Freetown Central',
    isVerifiedSeller: true,
    sellerRating: 4.8,
    description: 'Pure sine wave inverter with a one-year warranty.',
    specifications: {},
    features: [],
    condition: 'brand_new',
    sellerType: 'individual',
    sellerPhone: '+232 76 123456',
  };

  const created = await createListingSubmission('product', product, merchant, seams);
  assert.equal(created.submission.kind, 'product');
  assert.equal(created.submission.status, 'pending');
  assert.equal((await approvedListings<Product>('product', seams)).length, 0);

  const approved = await approveSubmission(created.submission.id, admin, undefined, seams);
  assert.equal(approved.submission.created_store_id, product.id);

  const listings = await approvedListings<Product>('product', seams);
  assert.deepEqual(listings.map((item) => item.id), [product.id]);

  const submittedMail = calls.find((call) => call.kind === 'listing_submitted');
  const approvedMailCall = calls.find((call) => call.kind === 'listing_approved');
  assert.equal(submittedMail?.name, product.title);
  assert.equal(approvedMailCall?.name, product.title);
  assert.equal(approvedMailCall?.to, merchant.email);
});

test('an approved application keeps its decision when its note is edited or cleared', async () => {
  const { seams, calls } = setup();
  const created = await createSubmission(storeApplication('Lumley Home'), merchant, seams);
  const approved = await approveSubmission(created.submission.id, admin, 'Original note', seams);

  const updated = await updateApprovalNote(created.submission.id, 'Updated note', seams);
  assert.equal(updated.status, 'approved');
  assert.equal(updated.review_note, 'Updated note');
  // The decision itself is untouched by the note edit.
  assert.equal(updated.reviewed_by, admin.id);
  assert.equal(updated.reviewed_at, approved.submission.reviewed_at);
  assert.equal(updated.created_store_id, approved.submission.created_store_id);
  assert.equal((await approvedStores(seams)).length, 1);

  const cleared = await updateApprovalNote(created.submission.id, '   ', seams);
  assert.equal(cleared.review_note, null);

  // Editing a note never sends another decision email.
  assert.deepEqual(calls.map((call) => call.kind), ['store_submitted', 'store_approved']);
});

test('the approval email can be previewed before the decision is made', async () => {
  const { seams, calls } = setup();
  const created = await createSubmission(storeApplication('Lumley Home'), merchant, seams);

  const preview = await previewApprovalEmail(
    created.submission.id,
    'Please confirm your payout number.',
    seams,
  );
  assert.match(preview.subject, /Lumley Home/);
  assert.match(preview.html, /\/stores\/lumley-home/);
  assert.match(preview.html, /Please confirm your payout number\./);
  // The preview's plain-text body carries the same note, not just the HTML version.
  assert.match(preview.text, /Please confirm your payout number\./);
  assert.match(preview.text, /Your public storefront:/);

  // Previewing neither emails the merchant nor decides the application.
  assert.deepEqual(calls.map((call) => call.kind), ['store_submitted']);
  assert.equal((await listSubmissions('pending', seams)).length, 1);
});

test('a pending application cannot have its note edited', async () => {
  const { seams } = setup();
  const created = await createSubmission(storeApplication('Kissy Electronics'), merchant, seams);
  await assert.rejects(
    () => updateApprovalNote(created.submission.id, 'Too early', seams),
    (error: unknown) => error instanceof SubmissionError && error.code === 'NOT_APPROVED' && error.status === 409,
  );
  assert.equal((await listSubmissions('pending', seams)).length, 1);
});

test('a store application without a session is refused before it reaches the queue', async () => {
  const { seams } = setup();
  await assert.rejects(
    () => createSubmission(storeApplication('Anonymous Store'), null, seams),
    (error: unknown) => error instanceof SubmissionError && error.code === 'UNAUTHENTICATED' && error.status === 401,
  );
  assert.equal((await listSubmissions(undefined, seams)).length, 0);
});

/** Keeps the mail assertions focused on decisions rather than submission receipts. */
const approvedMail = (calls: MailCall[]) => calls.filter((call) => call.kind === 'store_approved');
