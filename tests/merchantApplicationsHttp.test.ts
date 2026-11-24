import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express, { type Request, type RequestHandler, type Response } from 'express';
import { merchantApplicationsHandler, type MerchantApplicationsDeps } from '../server/merchantApplications.ts';
import { SubmissionError, type SubmissionRow } from '../server/storeSubmissions.ts';

const PATH = '/api/stores/submissions/mine';

const row = (overrides: Partial<SubmissionRow> & Pick<SubmissionRow, 'id'>): SubmissionRow => ({
  kind: 'store',
  payload: null,
  owner_id: 'user_1',
  owner_email: 'merchant@example.com',
  owner_name: 'Aminata Kamara',
  name: 'Kissy Electronics',
  slug: 'kissy-electronics',
  tagline: null,
  description: null,
  location_hub: null,
  province: null,
  street_address: null,
  phone: '+232 76 123456',
  payout_provider: null,
  payout_phone: null,
  logo: null,
  status: 'pending',
  review_note: null,
  reviewed_by: null,
  reviewed_at: null,
  created_store_id: null,
  created_at: '2026-11-24T10:00:00.000Z',
  updated_at: '2026-11-24T10:00:00.000Z',
  ...overrides,
});

async function withRoute(
  deps: MerchantApplicationsDeps,
  run: (url: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.get(PATH, ...merchantApplicationsHandler(deps));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}${PATH}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

const passGuard: RequestHandler = (_req, _res, next) => next();

test('GET /mine returns only the signed-in merchant applications', async () => {
  const rows = [
    row({ id: 'owned-by-id', owner_id: 'user_1', owner_email: 'other@example.com', status: 'pending' }),
    row({
      id: 'owned-by-email',
      owner_id: 'user_2',
      owner_email: 'merchant@example.com',
      status: 'rejected',
      review_note: 'Street address is incomplete',
    }),
    row({ id: 'someone-else', owner_id: 'user_2', owner_email: 'other@example.com', status: 'approved' }),
  ];

  await withRoute(
    {
      actorFor: async () => ({ id: 'user_1', email: 'merchant@example.com', name: 'Aminata' }),
      listSubmissions: async () => rows,
      requireSupabase: passGuard,
    },
    async (url) => {
      const res = await fetch(url);

      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') || '', /application\/json/);

      const body = (await res.json()) as { success: boolean; count: number; data: SubmissionRow[] };
      assert.equal(body.success, true);
      assert.equal(body.count, 2);
      assert.deepEqual(body.data.map((item) => item.id), ['owned-by-id', 'owned-by-email']);
      assert.deepEqual(body.data.map((item) => item.status), ['pending', 'rejected']);
      assert.equal(body.data[1].review_note, 'Street address is incomplete');
      // Another merchant's application never appears in the payload.
      assert.equal(JSON.stringify(body).includes('someone-else'), false);
    },
  );
});

test('GET /mine requires a signed-in merchant', async () => {
  let listCalls = 0;

  await withRoute(
    {
      actorFor: async () => null,
      listSubmissions: async () => {
        listCalls += 1;
        return [];
      },
      requireSupabase: passGuard,
    },
    async (url) => {
      const res = await fetch(url);
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { success: false, error: 'Please sign in' });
    },
  );

  // The queue is not even read for an anonymous request.
  assert.equal(listCalls, 0);
});

test('GET /mine is blocked by the Supabase guard before auth or data access', async () => {
  let actorCalls = 0;
  let listCalls = 0;
  const unavailable: RequestHandler = (_req: Request, res: Response) => {
    res.status(503).json({ success: false, error: 'Supabase is not configured on this deployment.', code: 'SUPABASE_NOT_CONFIGURED' });
  };

  await withRoute(
    {
      actorFor: async () => {
        actorCalls += 1;
        return { id: 'user_1', email: 'merchant@example.com' };
      },
      listSubmissions: async () => {
        listCalls += 1;
        return [];
      },
      requireSupabase: unavailable,
    },
    async (url) => {
      const res = await fetch(url);
      assert.equal(res.status, 503);
      assert.deepEqual(await res.json(), {
        success: false,
        error: 'Supabase is not configured on this deployment.',
        code: 'SUPABASE_NOT_CONFIGURED',
      });
    },
  );

  assert.equal(actorCalls, 0);
  assert.equal(listCalls, 0);
});

test('GET /mine maps a queue read failure onto the submission error contract', async () => {
  await withRoute(
    {
      actorFor: async () => ({ id: 'user_1', email: 'merchant@example.com' }),
      listSubmissions: async () => {
        throw new SubmissionError('Could not load submissions: connection reset', 500, 'DB_ERROR');
      },
      requireSupabase: passGuard,
    },
    async (url) => {
      const res = await fetch(url);
      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), {
        success: false,
        error: 'Could not load submissions: connection reset',
        code: 'DB_ERROR',
      });
    },
  );
});

test('GET /mine works for an id-only actor without matching an empty email', async () => {
  const rows = [
    row({ id: 'mine', owner_id: 'user_null_email', owner_email: 'someone@example.com' }),
    // Email fallback must be skipped, not matched against a null actor email.
    row({ id: 'not-mine', owner_id: 'user_2', owner_email: '' }),
  ];

  await withRoute(
    {
      actorFor: async () => ({ id: 'user_null_email', email: null }),
      listSubmissions: async () => rows,
      requireSupabase: passGuard,
    },
    async (url) => {
      const res = await fetch(url);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { count: number; data: SubmissionRow[] };
      assert.equal(body.count, 1);
      assert.deepEqual(body.data.map((item) => item.id), ['mine']);
    },
  );
});
