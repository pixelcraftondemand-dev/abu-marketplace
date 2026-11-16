import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, api, setClerkTokenProvider } from '../src/services/api.ts';

/** Replaces global fetch for one test and restores it afterwards. */
async function withFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    setClerkTokenProvider(null);
  }
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('retries a 401 once with a freshly minted Clerk token', async () => {
  const authorizations: (string | null)[] = [];
  const requestedOptions: (boolean | undefined)[] = [];
  let tokenRequests = 0;

  setClerkTokenProvider(async (options) => {
    tokenRequests += 1;
    requestedOptions.push(options?.skipCache);
    return tokenRequests === 1 ? 'stale-token' : 'fresh-token';
  });

  await withFetch(
    async (_url, init) => {
      authorizations.push(new Headers(init?.headers).get('authorization'));
      if (authorizations.length === 1) {
        return json({ success: false, error: 'Please sign in' }, 401);
      }
      return json({ success: true, data: [] }, 200);
    },
    async () => {
      const applications = await api.getMyStoreApplications();
      assert.deepEqual(applications, []);
    },
  );

  assert.deepEqual(authorizations, ['Bearer stale-token', 'Bearer fresh-token']);
  // The cached token is used first; only the retry is allowed to bypass the cache.
  assert.deepEqual(requestedOptions, [undefined, true]);
});

test('gives up after one retry when the session is really rejected', async () => {
  let fetchCalls = 0;
  let tokenRequests = 0;

  setClerkTokenProvider(async () => {
    tokenRequests += 1;
    return `token-${tokenRequests}`;
  });

  await withFetch(
    async () => {
      fetchCalls += 1;
      return json({ success: false, error: 'Admin access required' }, 403);
    },
    async () => {
      // A 403 is not a stale token, so it must not be retried at all.
      await assert.rejects(() => api.getStoreSubmissions(), (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 403);
        return true;
      });
    },
  );

  assert.equal(fetchCalls, 1);
  assert.equal(tokenRequests, 1);
});

test('does not loop when the refreshed token is also rejected', async () => {
  let fetchCalls = 0;

  setClerkTokenProvider(async () => 'always-stale');

  await withFetch(
    async () => {
      fetchCalls += 1;
      return json({ success: false, error: 'Please sign in' }, 401);
    },
    async () => {
      await assert.rejects(() => api.getMyStoreApplications(), (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 401);
        return true;
      });
    },
  );

  assert.equal(fetchCalls, 2);
});
