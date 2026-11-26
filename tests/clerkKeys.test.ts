import assert from 'node:assert/strict';
import test from 'node:test';
import { getClerkKeys } from '../server/clerkKeys.ts';

function withEnv(vars: Record<string, string | undefined>, run: () => void) {
  const saved = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('reads both Clerk keys from the environment and trims them', () => {
  withEnv(
    {
      VITE_CLERK_PUBLISHABLE_KEY: '  pk_test_abu \n',
      CLERK_SECRET_KEY: ' sk_test_abu ',
    },
    () => {
      assert.deepEqual(getClerkKeys(), {
        publishableKey: 'pk_test_abu',
        secretKey: 'sk_test_abu',
      });
    },
  );
});

test('returns empty strings when nothing is configured', () => {
  withEnv({ VITE_CLERK_PUBLISHABLE_KEY: undefined, CLERK_SECRET_KEY: undefined }, () => {
    assert.deepEqual(getClerkKeys(), { publishableKey: '', secretKey: '' });
  });
});
