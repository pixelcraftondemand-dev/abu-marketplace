import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));

import prisma from "@/lib/prisma";
import { checkDb, createDistributedRateLimiter } from "@/lib/services/rateLimitStore";

// ─── In-memory fake of the Prisma surface the limiter uses ───────────────────
// Implements updateMany/create/findUnique with the same where/data semantics
// (exact key+windowStart, windowStart: { lt }, count increment, P2002 on the
// unique key) so the concurrency logic can be exercised deterministically.
function createFakeDb() {
  const rows = new Map(); // key -> { key, windowStart (ms), count }

  const toMs = (v) => (v instanceof Date ? v.getTime() : v);

  const matches = (key, where) => {
    if (where.key !== undefined && key !== where.key) return false;
    if (where.windowStart !== undefined) {
      const ws = toMs(where.windowStart);
      if (where.windowStart.lt !== undefined) {
        if (!(rows.get(key).windowStart < toMs(where.windowStart.lt))) return false;
      } else if (rows.get(key).windowStart !== ws) {
        return false;
      }
    }
    return true;
  };

  return {
    rateLimitEntry: {
      async updateMany({ where, data }) {
        let count = 0;
        for (const key of rows.keys()) {
          if (!matches(key, where)) continue;
          count += 1;
          const row = rows.get(key);
          if (data.count?.increment) row.count += data.count.increment;
          else if (data.count !== undefined) row.count = data.count;
          if (data.windowStart !== undefined) row.windowStart = toMs(data.windowStart);
        }
        return { count };
      },
      async create({ data }) {
        if (rows.has(data.key)) {
          const err = new Error("Unique constraint failed on the fields: (`key`)");
          err.code = "P2002";
          throw err;
        }
        rows.set(data.key, {
          key: data.key,
          windowStart: toMs(data.windowStart),
          count: data.count ?? 1,
        });
        return rows.get(data.key);
      },
      async findUnique({ where, select }) {
        const row = rows.get(where.key);
        if (!row) return null;
        if (!select) return row;
        const out = {};
        for (const k of Object.keys(select)) out[k] = row[k];
        return out;
      },
    },
    _seed(key, windowStartMs, count) {
      rows.set(key, { key, windowStart: windowStartMs, count });
    },
  };
}

describe("checkDb (Postgres-backed fixed-window store)", () => {
  beforeEach(() => {
    const fakeDb = createFakeDb();
    prisma.rateLimitEntry = fakeDb.rateLimitEntry;
    prisma._seed = fakeDb._seed;
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows requests up to the limit and blocks beyond, with retryAfter", async () => {
    expect((await checkDb("checkout:user_1", 60_000, 2)).allowed).toBe(true);
    expect((await checkDb("checkout:user_1", 60_000, 2)).allowed).toBe(true);
    const blocked = await checkDb("checkout:user_1", 60_000, 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("resets the counter when the fixed window rolls over", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect((await checkDb("checkout:user_1", 60_000, 1)).allowed).toBe(true);
    expect((await checkDb("checkout:user_1", 60_000, 1)).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:01:00Z")); // next 60s bucket
    expect((await checkDb("checkout:user_1", 60_000, 1)).allowed).toBe(true);
  });

  it("tracks keys independently", async () => {
    expect((await checkDb("checkout:user_a", 60_000, 1)).allowed).toBe(true);
    expect((await checkDb("checkout:user_a", 60_000, 1)).allowed).toBe(false);
    expect((await checkDb("checkout:user_b", 60_000, 1)).allowed).toBe(true);
  });

  it("resets a stale bucket instead of carrying its old count forward", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:10:00Z"));
    // Pre-existing row from a previous window with a large count.
    prisma._seed("checkout:user_1", new Date("2026-01-01T00:00:00Z").getTime(), 99);

    expect((await checkDb("checkout:user_1", 60_000, 2)).allowed).toBe(true); // fresh bucket
    expect((await checkDb("checkout:user_1", 60_000, 2)).allowed).toBe(true);
    expect((await checkDb("checkout:user_1", 60_000, 2)).allowed).toBe(false);
  });

  it("handles the concurrent-create race (P2002) without double counting", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    // No row exists. Simulate another instance winning the create race: our
    // updateMany (current) and reset (stale) both miss, then our create hits
    // P2002 because the winner's row appeared in between. We must count our
    // hit once against the winner's row (1 + 1 = 2), never twice.
    const originalCreate = prisma.rateLimitEntry.create;
    prisma.rateLimitEntry.create = async ({ data }) => {
      // Winner's row lands between our updateMany and our create.
      prisma._seed(data.key, new Date("2026-01-01T00:00:00Z").getTime(), 1);
      return originalCreate({ data }); // now throws P2002 (key exists)
    };

    expect((await checkDb("checkout:user_1", 60_000, 3)).allowed).toBe(true); // 1 (winner) + 1 (us) = 2
    expect((await checkDb("checkout:user_1", 60_000, 3)).allowed).toBe(true); // 3
    expect((await checkDb("checkout:user_1", 60_000, 3)).allowed).toBe(false); // 4 > max 3
  });
});

describe("createDistributedRateLimiter (factory)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows when no key is provided", async () => {
    const limiter = createDistributedRateLimiter({ windowMs: 60_000, max: 1 });
    expect((await limiter.check(null)).allowed).toBe(true);
    expect((await limiter.check("")).allowed).toBe(true);
  });

  it("uses the in-memory store under the test environment and _clear() resets it", async () => {
    vi.stubEnv("VITEST", "true");
    const limiter = createDistributedRateLimiter({ windowMs: 60_000, max: 1, name: "rating" });
    expect((await limiter.check("user_1")).allowed).toBe(true);
    expect((await limiter.check("user_1")).allowed).toBe(false);
    limiter._clear();
    expect((await limiter.check("user_1")).allowed).toBe(true);
  });

  it("namespaces keys per limiter so counters never collide", async () => {
    vi.stubEnv("VITEST", "false"); // force the DB path against the fake
    const fakeDb = createFakeDb();
    prisma.rateLimitEntry = fakeDb.rateLimitEntry;
    prisma._seed = fakeDb._seed;

    const checkout = createDistributedRateLimiter({ windowMs: 60_000, max: 1, name: "checkout" });
    const rating = createDistributedRateLimiter({ windowMs: 60_000, max: 1, name: "rating" });

    expect((await checkout.check("user_1")).allowed).toBe(true);
    expect((await checkout.check("user_1")).allowed).toBe(false); // checkout exhausted
    expect((await rating.check("user_1")).allowed).toBe(true); // rating unaffected
  });

  it("degrades to the in-memory fallback when the DB is unreachable", async () => {
    vi.stubEnv("VITEST", "false"); // force the DB path so the fallback is real
    const fakeDb = createFakeDb();
    prisma.rateLimitEntry = fakeDb.rateLimitEntry;
    prisma.rateLimitEntry.updateMany = async () => {
      throw new Error("db down");
    };
    const limiter = createDistributedRateLimiter({ windowMs: 60_000, max: 1, name: "checkout" });
    expect((await limiter.check("user_1")).allowed).toBe(true);
    expect((await limiter.check("user_1")).allowed).toBe(false);
    expect((await limiter.check("user_2")).allowed).toBe(true);
  });
});
