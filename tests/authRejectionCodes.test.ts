import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUTH_REJECTION_CODES,
  authRejectionReason,
  getSessionUser,
  withAuthCode,
  type SessionUser,
} from '../server/supabase.ts';
import { failureHint } from '../src/lib/uploadDiagnostics.ts';

// These tests never reach Clerk: every verification is a seam that either resolves a
// payload or throws the error shape @clerk/backend uses for a refused token.
process.env.CLERK_SECRET_KEY = 'sk_test_auth_rejection_codes';

const merchant: SessionUser = {
  id: 'user_auth_rejection_codes',
  email: 'merchant@example.com',
  name: 'Test Merchant',
  image: null,
  phoneNumber: null,
  role: 'buyer',
  preferredCity: null,
  provider: 'clerk',
  createdAt: '2026-11-20T00:00:00.000Z',
};

const payload = (sub: string | undefined) => ({
  sub: sub as string,
  azp: 'https://abumarketplace.shop',
  iss: 'https://regression.clerk.accounts.dev',
  sid: 'sess_auth_rejection_codes',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
});

const request = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as Parameters<typeof getSessionUser>[0];

/** Drives `getSessionUser` into each rejection path and returns the request it refused. */
async function refusedRequest(code: (typeof AUTH_REJECTION_CODES)[number]) {
  if (code === 'secret-missing') {
    // Both the live and the development secret must be absent for this branch to run.
    const saved = {
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_DEV_SECRET_KEY: process.env.CLERK_DEV_SECRET_KEY,
    };
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_DEV_SECRET_KEY;
    try {
      const req = request('Bearer session-token');
      assert.equal(await getSessionUser(req, { verify: (async () => payload('x')) as never }), null);
      return req;
    } finally {
      if (saved.CLERK_SECRET_KEY !== undefined) process.env.CLERK_SECRET_KEY = saved.CLERK_SECRET_KEY;
      if (saved.CLERK_DEV_SECRET_KEY !== undefined) process.env.CLERK_DEV_SECRET_KEY = saved.CLERK_DEV_SECRET_KEY;
    }
  }

  const req = code === 'missing-token' ? request() : request('Bearer session-token');
  const verify = (async () => {
    if (code === 'token-expired') throw new Error('Token has expired.');
    if (code === 'azp-mismatch') throw new Error('Invalid JWT authorized party.');
    if (code === 'signature-mismatch') throw new Error('Invalid JWT signature.');
    if (code === 'malformed-token') throw new Error('Malformed JWT.');
    if (code === 'invalid-token') throw new Error('Invalid token.');
    if (code === 'missing-subject') return payload(undefined);
    return payload(merchant.id);
  }) as never;

  const user = await getSessionUser(req, { verify, loadProfile: async () => merchant });
  if (code === 'missing-token') assert.equal(user, null);
  return req;
}

/** The 401 bodies the API returns, one per guarded route. */
const ROUTE_401_MESSAGES = [
  'Please sign in to list a product',
  'Please sign in to open a store',
  'Please sign in to upload a store logo',
  'Please sign in to apply for a store',
  'Please sign in',
  'Please sign in to register a service',
];

test('every rejection reason reaches the 401 body the routes return', async () => {
  for (const code of AUTH_REJECTION_CODES) {
    const req = await refusedRequest(code);
    assert.equal(authRejectionReason(req), code, `${code} was recorded as the rejection reason`);

    for (const message of ROUTE_401_MESSAGES) {
      const body = withAuthCode(req, { success: false, error: message });
      assert.deepEqual(body, { success: false, error: message, code });
    }
  }
});

test('a refused session names a reason for both the logo and submission routes', async () => {
  const req = await refusedRequest('token-expired');

  // POST /api/stores/logo
  assert.deepEqual(withAuthCode(req, { success: false, error: 'Please sign in to upload a store logo' }), {
    success: false,
    error: 'Please sign in to upload a store logo',
    code: 'token-expired',
  });

  // POST /api/stores/submissions and GET /api/stores/submissions/mine
  assert.deepEqual(withAuthCode(req, { success: false, error: 'Please sign in to apply for a store' }), {
    success: false,
    error: 'Please sign in to apply for a store',
    code: 'token-expired',
  });
  assert.deepEqual(withAuthCode(req, { success: false, error: 'Please sign in' }), {
    success: false,
    error: 'Please sign in',
    code: 'token-expired',
  });
});

test('an accepted session adds no code and leaves the body untouched', async () => {
  const req = request('Bearer session-token');
  const user = await getSessionUser(req, { verify: (async () => payload(merchant.id)) as never, loadProfile: async () => merchant });

  assert.deepEqual(user, merchant);
  assert.equal(authRejectionReason(req), null);

  const body = { success: false, error: 'Please sign in' };
  assert.equal(withAuthCode(req, body), body);
  assert.equal('code' in withAuthCode(req, body), false);
});

test('a rejection on a reused request does not leak into the next call', async () => {
  const req = request('Bearer session-token');
  await getSessionUser(req, {
    verify: (async () => {
      throw new Error('Invalid JWT signature.');
    }) as never,
  });
  assert.equal(authRejectionReason(req), 'signature-mismatch');

  // The same request object retried with a token that now verifies must not keep the code.
  await getSessionUser(req, { verify: (async () => payload(merchant.id)) as never, loadProfile: async () => merchant });
  assert.equal(authRejectionReason(req), null);
  assert.deepEqual(withAuthCode(req, { success: false, error: 'Please sign in' }), {
    success: false,
    error: 'Please sign in',
  });
});

test('reason codes name the cause without exposing key material', async () => {
  for (const code of AUTH_REJECTION_CODES) {
    assert.match(code, /^[a-z]+(-[a-z]+)*$/, `${code} is a stable short code`);
    assert.doesNotMatch(code, /sk_(test|live)_/);
  }
});

test('the diagnostics hint explains every reason code it can receive', () => {
  const hints = new Map<string, string>();
  const generic401 = failureHint(401, null);

  for (const code of AUTH_REJECTION_CODES) {
    const hint = failureHint(401, code);
    assert.ok(hint.length > 0, `${code} has a hint`);
    assert.notEqual(hint, generic401, `${code} is explained, not lumped into the generic 401 hint`);
    hints.set(code, hint);
  }

  assert.equal(new Set(hints.values()).size, AUTH_REJECTION_CODES.length, 'each code gets its own advice');

  assert.match(hints.get('secret-missing')!, /CLERK_SECRET_KEY/);
  assert.match(hints.get('missing-token')!, /sign in again/i);
  assert.match(hints.get('token-expired')!, /expired/i);
  assert.match(hints.get('azp-mismatch')!, /CLERK_AUTHORIZED_PARTIES/);
  assert.match(hints.get('signature-mismatch')!, /different Clerk instances/i);
  assert.match(hints.get('missing-subject')!, /user id/i);
  assert.match(hints.get('malformed-token')!, /header/i);
  assert.match(hints.get('invalid-token')!, /instance/i);
});

test('the diagnostics hint prefers the reason code over the status', () => {
  // A 403 must still name a missing secret rather than the generic "token refused" text.
  assert.match(failureHint(403, 'secret-missing'), /CLERK_SECRET_KEY/);
  // No response means nothing was sent, so there is no rejection code to explain.
  assert.match(failureHint(null, 'missing-token'), /No HTTP response/);
  // Without a code, the status still drives the hint.
  assert.match(failureHint(401, null), /without a reason/);
  assert.match(failureHint(429, null), /per-IP limit/);
  assert.match(failureHint(503, null), /IMAGEKIT/);
  assert.match(failureHint(500, null), /deployment logs/);
});
