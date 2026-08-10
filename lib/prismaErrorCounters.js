/**
 * Process-local counters for Prisma log events, exposed through
 * `GET /api/health/prisma` so the post-deploy smoke battery can assert that
 * NO unexpected `prisma:error` lines were emitted during the rate-limit
 * hammer (check #12 in scripts/prod-smoke.sh).
 *
 * These are PER-INSTANCE counters: on serverless (Vercel) each lambda keeps
 * its own totals and cold starts reset them. That is fine for the smoke
 * check's purpose — the hammer pins a warm instance and the follow-up
 * fetches read the same instance — but the numbers must never be treated as
 * cluster-wide totals.
 *
 * `suppressedRateLimitP2002` counts the EXPECTED rate-limit bucket race
 * (concurrent first-create; see lib/prismaLogFilter.js) — a value > 0 is
 * healthy, it is the filtered path working. `unexpectedPrismaErrors` counts
 * every other Prisma error event; the smoke check asserts this stays 0.
 */
const COUNTERS_KEY = "__prismaErrorCounters";

function counters() {
  if (!globalThis[COUNTERS_KEY]) {
    globalThis[COUNTERS_KEY] = {
      unexpectedPrismaErrors: 0,
      suppressedRateLimitP2002: 0,
    };
  }
  return globalThis[COUNTERS_KEY];
}

/** Called when an unexpected (non-rate-limit) Prisma error event fires. */
export function recordPrismaError() {
  counters().unexpectedPrismaErrors += 1;
}

/** Called when the expected rate-limit P2002 event is filtered out. */
export function recordSuppressedRateLimitP2002() {
  counters().suppressedRateLimitP2002 += 1;
}

/** Read-only snapshot of the counters (shallow copy). */
export function getPrismaErrorCounters() {
  return { ...counters() };
}

/** Test hook: zero the counters (vitest workers may share globalThis). */
export function resetPrismaErrorCounters() {
  if (globalThis[COUNTERS_KEY]) {
    globalThis[COUNTERS_KEY].unexpectedPrismaErrors = 0;
    globalThis[COUNTERS_KEY].suppressedRateLimitP2002 = 0;
  }
}
