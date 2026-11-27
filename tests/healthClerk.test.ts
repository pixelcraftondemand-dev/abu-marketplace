import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

// Keep server.ts from binding a port; its default export is the Express app.
process.env.VERCEL = '1';
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_health_check';
// The ellipsis is the malformed character that real deployments had pasted in.
const malformedSecret = 'sk_live_12345678\u2026abcdef';
process.env.CLERK_SECRET_KEY = malformedSecret;

test('a malformed secret reports clerkVerified false without exposing the key', async () => {
  const { default: app } = await import('../server.ts');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('cache-control') || '', /no-store/);

    const body = (await res.json()) as {
      status?: string;
      currency?: string;
      clerkVerified?: boolean;
      clerkError?: string | null;
      secretPrefix?: string;
      secretLength?: number;
      supabase?: boolean;
      uploads?: { storeLogo?: string };
    };

    assert.equal(body.status, 'healthy');
    assert.equal(body.currency, 'SLE');
    assert.equal(body.clerkVerified, false);
    assert.match(body.clerkError ?? '', /non-ASCII/i);
    // The raw header conversion error is not shown to admins.
    assert.doesNotMatch(body.clerkError ?? '', /ByteString|character at index/i);
    assert.equal(body.secretPrefix, malformedSecret.slice(0, 8));
    assert.equal(body.secretLength, malformedSecret.length);
    assert.equal(typeof body.supabase, 'boolean');
    assert.equal(typeof body.uploads?.storeLogo, 'string');

    // Only the prefix and length may leave the server, never the full key.
    const payload = JSON.stringify(body);
    assert.equal(payload.includes(malformedSecret), false);
    assert.equal(payload.includes(malformedSecret.slice(8)), false);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
