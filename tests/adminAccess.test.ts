import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSessionRole } from '../server/supabase.ts';
import { isAdmin } from '../server/storeSubmissions.ts';

test('a Clerk admin grant survives the buyer profile created on first load', () => {
  // clerk_profiles.role defaults to 'buyer', so preferring it would silently lock an
  // operator out of the review queue after their first signed-in request.
  assert.equal(resolveSessionRole('admin', 'buyer'), 'admin');
});

test('a profile admin grant survives buyer Clerk metadata', () => {
  assert.equal(resolveSessionRole('buyer', 'admin'), 'admin');
});

test('a logistics grant is preserved from either source', () => {
  assert.equal(resolveSessionRole('logistics_agent', 'buyer'), 'logistics_agent');
  assert.equal(resolveSessionRole(undefined, 'logistics_agent'), 'logistics_agent');
});

test('ordinary roles are taken from the profile, then metadata, then buyer', () => {
  assert.equal(resolveSessionRole('buyer', 'merchant'), 'merchant');
  assert.equal(resolveSessionRole('merchant', undefined), 'merchant');
  assert.equal(resolveSessionRole(undefined, undefined), 'buyer');
  assert.equal(resolveSessionRole(42, null), 'buyer');
});

test('ADMIN_EMAIL from older deployments still grants access', () => {
  const saved = { emails: process.env.ADMIN_EMAILS, email: process.env.ADMIN_EMAIL };
  delete process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAIL = 'operator@example.com';
  try {
    assert.equal(isAdmin({ id: 'u1', email: 'operator@example.com', role: 'buyer' }), true);
    assert.equal(isAdmin({ id: 'u2', email: 'stranger@example.com', role: 'buyer' }), false);
    assert.equal(isAdmin({ id: 'u3', email: 'operator@example.com', role: 'admin' }), true);
  } finally {
    if (saved.emails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = saved.emails;
    if (saved.email === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = saved.email;
  }
});
