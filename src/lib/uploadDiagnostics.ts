/**
 * Keeps the most recent store logo upload outcome in this browser.
 *
 * The upload fails in ways that leave no trace in the form once the merchant closes
 * the modal, and the deployed API logs are not reachable from the admin panel. Recording
 * the last attempt per browser lets an admin open Diagnostics and see exactly what the
 * merchant's upload path did — the message, the HTTP status, and how many bytes were sent.
 */

export type StoreLogoOutcome = {
  outcome: 'uploaded' | 'failed';
  /** `upload` reached the API; `file` was refused locally before any request. */
  kind: 'upload' | 'file';
  message: string;
  /** HTTP status when the API answered, null for a local refusal or a network failure. */
  status: number | null;
  fileName: string;
  fileType: string;
  /** Size of the file the merchant picked. */
  sourceBytes: number;
  /** Size actually sent after browser resizing, null when nothing was sent. */
  sentBytes: number | null;
  at: string;
};

const STORAGE_KEY = 'abu.store-logo-upload.v1';

export interface OutcomeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage when the browser allows it; disabled storage and SSR simply skip recording. */
export function outcomeStorage(): OutcomeStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function recordStoreLogoOutcome(record: StoreLogoOutcome, store = outcomeStorage()): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private mode or a full quota must never break the upload itself.
  }
}

export function readStoreLogoOutcome(store = outcomeStorage()): StoreLogoOutcome | null {
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Partial<StoreLogoOutcome>;
    if (record.outcome !== 'uploaded' && record.outcome !== 'failed') return null;
    if (typeof record.at !== 'string' || typeof record.message !== 'string') return null;
    return {
      outcome: record.outcome,
      kind: record.kind === 'file' ? 'file' : 'upload',
      message: record.message,
      status: typeof record.status === 'number' ? record.status : null,
      fileName: typeof record.fileName === 'string' ? record.fileName : 'unknown',
      fileType: typeof record.fileType === 'string' ? record.fileType : 'unknown',
      sourceBytes: typeof record.sourceBytes === 'number' ? record.sourceBytes : 0,
      sentBytes: typeof record.sentBytes === 'number' ? record.sentBytes : null,
      at: record.at,
    };
  } catch {
    return null;
  }
}

export function clearStoreLogoOutcome(store = outcomeStorage()): void {
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; the panel re-reads and shows an empty state either way.
  }
}
