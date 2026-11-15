import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveClerkKeys } from '../server/clerkKeys.ts';

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

test('reports empty keys instead of throwing when nothing is configured', () => {
  const keys = resolveClerkKeys({}, { mode: 'production' });

  assert.equal(keys.publishableKey, '');
  assert.equal(keys.secretKey, '');
});
