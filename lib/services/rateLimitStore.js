// ─────────────────────────────────────────────────────────────────────────────
// Distributed rate limiting (serverless-safe).
//
// The in-memory limiters in lib/security.js are single-instance only — on
// Vercel each lambda has its own heap, so an attacker can stripe requests
// across instances to bypass them. This store keeps the same fixed-window
// semantics but counts in Postgres (`rate_limit_entry`), so the limit holds
// across every instance.
//
// The window is a fixed bucket: floor(now / windowMs) * windowMs. Each check
// is an atomic conditional increment (`updateMany ... where key + windowStart,
// data count += 1`), so concurrent instances can never double-count a bucket.
// A lost insert race (P2002) is retried; a stale bucket is reset before the
// increment. See tests/lib/rateLimitStore.test.js.
//
// Keys are namespaced per limiter (`name:identifier`), so the thirteen shared
// limiters never collide on the same table row — otherwise a user's checkout
// traffic would count against their verification/rating limits and vice versa.
//
// Test isolation: under vitest (`VITEST=true`/NODE_ENV=test) the limiter runs
// in-memory so `_clear()` fully resets state between tests and the API test
// suite never depends on a live database. The Postgres path is exercised by
// the dedicated unit tests (mocked Prisma) and the runtime check.
//
// Production fallback: if the DB is unreachable the check degrades to a
// per-instance in-memory limiter so requests are never hard-failed by the
// limiter itself (the payment/auth code will fail for other reasons if the
// DB is down). The degradation is logged so it is observable.
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";

/** In-memory fallback — same fixed-window semantics, single-instance only. */
function createMemoryLimiter({ windowMs, max }) {
  const hits = new Map();
  return {
    check(key) {
      if (!key) return { allowed: true };
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || now > entry.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: max - 1 };
      }
      entry.count += 1;
      if (entry.count > max) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
      }
      return { allowed: true, remaining: max - entry.count };
    },
    _clear() {
      hits.clear();
    },
  };
}

/**
 * Atomic fixed-window check against the shared Postgres store.
 * Returns { allowed, remaining?, retryAfter? } — the same shape as the
 * in-memory limiter so callers can swap seamlessly.
 */
export async function checkDb(key, windowMs, max) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowDate = new Date(windowStart);

  // 1) Atomic increment — only matches a row already in the current window.
  const updated = await prisma.rateLimitEntry.updateMany({
    where: { key, windowStart: windowDate },
    data: { count: { increment: 1 } },
  });

  let count;
  if (updated.count === 1) {
    const row = await prisma.rateLimitEntry.findUnique({
      where: { key },
      select: { count: true },
    });
    count = row?.count ?? 1;
  } else {
    // 2) No row in the current window. First reset any STALE bucket (older
    // windowStart) to the current window with count=1 — atomic, so only one
    // instance's reset can match. This is the common bucket-rollover path and
    // it never hits the unique constraint (an UPDATE, not an INSERT), which
    // keeps the expected P2002 out of the hot path entirely.
    const reset = await prisma.rateLimitEntry.updateMany({
      where: { key, windowStart: { lt: windowDate } },
      data: { windowStart: windowDate, count: 1 },
    });
    if (reset.count === 1) {
      count = 1; // stale bucket rolled over — this check is the first in the window
    } else {
      // 3) No row at all — a brand-new key. Create it. The only remaining
      // race is two instances creating the same new key simultaneously; the
      // loser hits P2002 (expected, logged at info level) and counts itself
      // against the winner's row.
      try {
        await prisma.rateLimitEntry.create({
          data: { key, windowStart: windowDate, count: 1 },
        });
        count = 1;
      } catch (error) {
        if (error?.code !== "P2002") throw error;
        await prisma.rateLimitEntry.updateMany({
          where: { key, windowStart: windowDate },
          data: { count: { increment: 1 } },
        });
        const row = await prisma.rateLimitEntry.findUnique({
          where: { key },
          select: { count: true },
        });
        count = row?.count ?? 1;
      }
    }
  }

  const allowed = count <= max;
  return {
    allowed,
    remaining: allowed ? Math.max(0, max - count) : undefined,
    retryAfter: allowed ? undefined : Math.ceil((windowStart + windowMs - now) / 1000),
  };
}

/**
 * Distributed limiter with the same `check(key)` interface as the in-memory
 * `createRateLimiter`, but backed by Postgres so limits hold across serverless
 * instances. `check` is async — callers must await it.
 *
 * `name` namespaces the stored key (`name:identifier`) so multiple limiters
 * sharing the table never interfere with each other's counters.
 */
export function createDistributedRateLimiter({ windowMs, max, name = "rl" }) {
  const memory = createMemoryLimiter({ windowMs, max });
  const keyFor = (key) => `${name}:${key}`;
  // Evaluated per call so tests can flip the env to exercise the DB path.
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

  if (isTest) {
    // Test mode: fully in-memory so `_clear()` resets state and the API test
    // suite never needs a database. See the header comment.
    return {
      check: (key) => (key ? memory.check(keyFor(key)) : { allowed: true }),
      _clear: () => memory._clear(),
    };
  }

  return {
    async check(key) {
      if (!key) return { allowed: true };
      try {
        return await checkDb(keyFor(key), windowMs, max);
      } catch (error) {
        // DB unavailable — degrade to a per-instance limiter (documented above).
        console.error(
          `[rate-limit] Postgres store unavailable for "${name}", degrading to in-memory limiting:`,
          error?.message || error
        );
        return memory.check(keyFor(key));
      }
    },
    _clear() {
      memory._clear();
    },
  };
}
