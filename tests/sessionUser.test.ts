import assert from 'node:assert/strict';
import test from 'node:test';
import { getSessionUser, type SessionUser } from '../server/supabase.ts';

// A fake key is enough: the verifier is stubbed, so nothing reaches Clerk or Supabase.
process.env.CLERK_SECRET_KEY = 'sk_test_session_regression';

const SECRET_KEY = 'sk_test_session_regression';

const sessionUser: SessionUser = {
  id: 'user_session_regression',
  email: 'merchant@example.com',
  name: 'Test Merchant',
  image: null,
  phoneNumber: null,
  role: 'buyer',
  preferredCity: null,
  provider: 'clerk',
  createdAt: '2026-11-12T00:00:00.000Z',
};

/** What @clerk/backend's verifyToken actually resolves to: the decoded session payload. */
const sessionPayload = (sub?: string) => ({
  sub: sub as string,
  azp: 'http://localhost:3000',
  iss: 'https://regression.clerk.accounts.dev',
  sid: 'sess_regression',
  iat: Math.floor(Date.now() / 1000),
  nbf: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
});

const request = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as Parameters<typeof getSessionUser>[0];

test('recognizes a valid Clerk session payload and loads that user', async () => {
  const loadedFor: string[] = [];
  const verify = async (token: string) => {
    assert.equal(token, 'session-token');
    return sessionPayload('user_session_regression') as never;
  };

  const user = await getSessionUser(request('Bearer session-token'), {
    verify: verify as never,
    loadProfile: async (clerkId, secretKey) => {
      loadedFor.push(clerkId);
      assert.equal(secretKey, SECRET_KEY);
      assert.equal(clerkId, sessionUser.id);
      return sessionUser;
    },
  });

  assert.deepEqual(user, sessionUser);
  assert.deepEqual(loadedFor, ['user_session_regression']);
});

test('does not read the Clerk user id from a { data } envelope', async () => {
  // verifyToken unwraps its legacy { data } envelope, so a payload shaped like
  // { data: { sub } } must not be treated as a signed-in session.
  let profileLoads = 0;
  const user = await getSessionUser(request('Bearer session-token'), {
    verify: (async () => ({ data: { sub: 'user_session_regression' } })) as never,
    loadProfile: async () => {
      profileLoads += 1;
      return sessionUser;
    },
  });

  assert.equal(user, null);
  assert.equal(profileLoads, 0);
});

test('rejects a verified payload without a subject', async () => {
  let profileLoads = 0;
  const user = await getSessionUser(request('Bearer session-token'), {
    verify: (async () => sessionPayload(undefined)) as never,
    loadProfile: async () => {
      profileLoads += 1;
      return sessionUser;
    },
  });

  assert.equal(user, null);
  assert.equal(profileLoads, 0);
});

test('ignores requests without a bearer token', async () => {
  let verifications = 0;
  const user = await getSessionUser(request(), {
    verify: (async () => {
      verifications += 1;
      return sessionPayload('user_session_regression');
    }) as never,
  });

  assert.equal(user, null);
  assert.equal(verifications, 0);
});

test('treats a failing verification as signed out', async () => {
  const user = await getSessionUser(request('Bearer tampered-token'), {
    verify: (async () => {
      throw new Error('Invalid JWT signature.');
    }) as never,
  });

  assert.equal(user, null);
});
