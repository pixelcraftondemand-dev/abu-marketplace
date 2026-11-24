import assert from 'node:assert/strict';
import test from 'node:test';
import { isRedactedClerkKey, resolveClerkKeys } from '../server/clerkKeys.ts';

const LIVE = {
  VITE_CLERK_PUBLISHABLE_KEY: 'pk_live_abu',
  CLERK_SECRET_KEY: 'sk_live_abu',
};

const DEV = {
  CLERK_DEV_PUBLISHABLE_KEY: 'pk_test_dev',
  CLERK_DEV_SECRET_KEY: 'sk_test_dev',
};

test('local development signs in with the development instance', () => {
  const keys = resolveClerkKeys({ ...LIVE, ...DEV }, { mode: 'development' });

  assert.deepEqual(keys, {
    environment: 'development',
    publishableKey: 'pk_test_dev',
    secretKey: 'sk_test_dev',
  });
});

test('production deployments keep the live instance', () => {
  const keys = resolveClerkKeys({ ...LIVE, ...DEV }, { mode: 'production' });

  assert.deepEqual(keys, {
    environment: 'production',
    publishableKey: 'pk_live_abu',
    secretKey: 'sk_live_abu',
  });
});

test('Vercel preview deployments use the development instance despite the production build mode', () => {
  const keys = resolveClerkKeys({ ...LIVE, ...DEV, VERCEL_ENV: 'preview' }, { mode: 'production' });

  assert.equal(keys.environment, 'development');
  assert.equal(keys.publishableKey, 'pk_test_dev');
});

test('falls back to the live instance when the development pair is incomplete', () => {
  const keys = resolveClerkKeys({ ...LIVE, CLERK_DEV_PUBLISHABLE_KEY: 'pk_test_dev' }, { mode: 'development' });

  assert.equal(keys.environment, 'production');
  assert.equal(keys.publishableKey, 'pk_live_abu');
  assert.equal(keys.secretKey, 'sk_live_abu');
});

test('CLERK_USE_DEV_INSTANCE opts a production build into the development instance', () => {
  const keys = resolveClerkKeys(
    { ...LIVE, ...DEV, CLERK_USE_DEV_INSTANCE: 'true' },
    { mode: 'production' },
  );

  assert.equal(keys.environment, 'development');
});

test('a redacted placeholder is recognised instead of trusted as a live key', () => {
  // The ellipsis form is what a dashboard snippet pastes into .env, and the ASCII
  // spelling is what a person types by hand. Both verify nothing.
  assert.equal(isRedactedClerkKey('sk_live_\u2026'), true);
  assert.equal(isRedactedClerkKey('sk_live_...'), true);
  assert.equal(isRedactedClerkKey('sk_live_AbCdEf1234567890'), false);
  assert.equal(isRedactedClerkKey(''), false);
  assert.equal(isRedactedClerkKey(undefined), false);
});

test('health reports a redacted secret as invalid, never as live', async () => {
  const saved = {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_DEV_SECRET_KEY: process.env.CLERK_DEV_SECRET_KEY,
  };
  process.env.CLERK_SECRET_KEY = 'sk_live_\u2026';
  delete process.env.CLERK_DEV_SECRET_KEY;
  try {
    const { clerkKeyMode } = await import('../server/supabase.ts');
    assert.equal(clerkKeyMode(), 'invalid');
  } finally {
    if (saved.CLERK_SECRET_KEY === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = saved.CLERK_SECRET_KEY;
    if (saved.CLERK_DEV_SECRET_KEY !== undefined) process.env.CLERK_DEV_SECRET_KEY = saved.CLERK_DEV_SECRET_KEY;
  }
});

test('reports empty keys instead of throwing when nothing is configured', () => {
  const keys = resolveClerkKeys({}, { mode: 'production' });

  assert.equal(keys.publishableKey, '');
  assert.equal(keys.secretKey, '');
});
