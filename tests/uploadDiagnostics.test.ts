import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearStoreLogoOutcome,
  readStoreLogoOutcome,
  recordStoreLogoOutcome,
  type OutcomeStorage,
  type StoreLogoOutcome,
} from '../src/lib/uploadDiagnostics.ts';

/** Minimal stand-in for localStorage, including a throwable setItem for quota cases. */
function fakeStorage(options: { failWrites?: boolean } = {}): OutcomeStorage & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      if (options.failWrites) throw new Error('QuotaExceededError');
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}

const failure: StoreLogoOutcome = {
  outcome: 'failed',
  kind: 'upload',
  message: 'The marketplace could not confirm this request, so the logo was not uploaded.',
  status: 401,
  fileName: 'shop-front.jpg',
  fileType: 'image/jpeg',
  sourceBytes: 8 * 1024 * 1024,
  sentBytes: 210 * 1024,
  at: '2026-11-18T01:20:00.000Z',
};

test('round-trips the last upload outcome', () => {
  const store = fakeStorage();
  recordStoreLogoOutcome(failure, store);

  assert.deepEqual(readStoreLogoOutcome(store), failure);
});

test('keeps only the most recent attempt', () => {
  const store = fakeStorage();
  recordStoreLogoOutcome(failure, store);
  recordStoreLogoOutcome({ ...failure, outcome: 'uploaded', message: 'Uploaded logo.webp.', status: 200 }, store);

  const latest = readStoreLogoOutcome(store);
  assert.equal(latest?.outcome, 'uploaded');
  assert.equal(latest?.message, 'Uploaded logo.webp.');
});

test('clearing removes the record', () => {
  const store = fakeStorage();
  recordStoreLogoOutcome(failure, store);
  clearStoreLogoOutcome(store);

  assert.equal(readStoreLogoOutcome(store), null);
});

test('ignores corrupt or foreign values instead of throwing', () => {
  const store = fakeStorage();
  store.entries.set('abu.store-logo-upload.v1', '{not json');
  assert.equal(readStoreLogoOutcome(store), null);

  store.entries.set('abu.store-logo-upload.v1', JSON.stringify({ outcome: 'pending' }));
  assert.equal(readStoreLogoOutcome(store), null);

  store.entries.set('abu.store-logo-upload.v1', JSON.stringify({ outcome: 'failed' }));
  assert.equal(readStoreLogoOutcome(store), null);
});

test('fills in defaults for fields an older record may be missing', () => {
  const store = fakeStorage();
  store.entries.set(
    'abu.store-logo-upload.v1',
    JSON.stringify({ outcome: 'failed', message: 'Refused locally.', at: '2026-11-18T01:20:00.000Z' }),
  );

  const record = readStoreLogoOutcome(store);
  assert.equal(record?.kind, 'upload');
  assert.equal(record?.status, null);
  assert.equal(record?.sentBytes, null);
  assert.equal(record?.fileName, 'unknown');
  assert.equal(record?.sourceBytes, 0);
});

test('a storage that refuses writes never breaks the upload', () => {
  const store = fakeStorage({ failWrites: true });
  assert.doesNotThrow(() => recordStoreLogoOutcome(failure, store));
  assert.equal(readStoreLogoOutcome(store), null);
});

test('no storage available is a no-op, not a crash', () => {
  assert.doesNotThrow(() => recordStoreLogoOutcome(failure, null));
  assert.equal(readStoreLogoOutcome(null), null);
  assert.doesNotThrow(() => clearStoreLogoOutcome(null));
});
