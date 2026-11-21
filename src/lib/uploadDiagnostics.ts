/**
 * Keeps the most recent store logo upload outcome in this browser.
 *
 * The upload fails in ways that leave no trace in the form once the merchant closes
 * the modal, and the deployed API logs are not reachable from the admin panel. Recording
 * the last attempt per browser lets an admin open Diagnostics and see exactly what the
 * merchant's upload path did — the message, the HTTP status, and how many bytes were sent.
 */

/**
 * What an admin should check for a failed attempt. The server's reason code wins over the
 * HTTP status, because a 401 named `secret-missing` and one named `token-expired` need
 * opposite fixes.
 */
export const failureHint = (status: number | null, authCode?: string | null): string => {
  if (status === null) {
    return 'No HTTP response: the transfer failed or was blocked. Check the network, a proxy, or an ad blocker, then retry the upload.';
  }
  if (authCode === 'secret-missing') {
    return 'The API has no Clerk secret, so it cannot verify any session. Set CLERK_SECRET_KEY in Vercel for the same instance as the publishable key.';
  }
  if (authCode === 'missing-token') {
    return 'The browser sent no session token with the upload. The merchant is signed out in this tab; sign in again and retry.';
  }
  if (authCode === 'token-expired') {
    return 'The session token had expired when the upload was sent. Refresh the page, sign in again, and retry.';
  }
  if (authCode === 'azp-mismatch') {
    return 'The token was minted for a different origin than the one serving the API. List both hostnames in CLERK_AUTHORIZED_PARTIES.';
  }
  if (authCode === 'signature-mismatch') {
    return "The token signature does not match this deployment's Clerk secret. The browser and API are on different Clerk instances.";
  }
  if (authCode === 'missing-subject') {
    return 'The token verified but carried no user id, so it was not minted for this Clerk instance. Sign in again from the marketplace site and retry.';
  }
  if (authCode === 'malformed-token') {
    return 'The Authorization header was not a readable Clerk token. An older cached build or a proxy may be sending a bad header; reload the page and retry.';
  }
  if (authCode === 'invalid-token') {
    return 'Clerk refused the token outright, which usually means it was minted by another instance. Check that CLERK_SECRET_KEY matches the publishable key the site loads.';
  }
  if (status === 401 || status === 403) {
    return 'The API refused the session token without a reason this panel explains. Compare CLERK_SECRET_KEY in Vercel with the publishable key the site loads: they must belong to the same Clerk instance.';
  }
  if (status === 413) {
    return 'The request body was too large for the platform limit. Browser resizing should keep this well under 4 MB; a logo this large means resizing did not run.';
  }
  if (status === 429) {
    return 'The per-IP limit (8 uploads per 10 minutes) was hit. Wait for the window to pass before retrying.';
  }
  if (status === 503) {
    return 'The logo route reports ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT in Vercel.';
  }
  if (status >= 500) {
    return 'The server or ImageKit failed after the token was accepted. Check the deployment logs for the ImageKit status code.';
  }
  return 'The API rejected the request itself; the message above is the server reason.';
};

export type StoreLogoOutcome = {
  outcome: 'uploaded' | 'failed';
  /** `upload` reached the API; `file` was refused locally before any request. */
  kind: 'upload' | 'file';
  message: string;
  /** HTTP status when the API answered, null for a local refusal or a network failure. */
  status: number | null;
  /**
   * The server's reason code for a refused session (`missing-token`, `token-expired`,
   * `azp-mismatch`, `secret-missing`, …), when it supplied one. Absent on older records.
   */
  authCode?: string | null;
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
      // Only present when the server named a reason, so older records read back unchanged.
      ...(typeof record.authCode === 'string' && record.authCode ? { authCode: record.authCode } : {}),
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
