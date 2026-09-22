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
interface PrismaErrorCounters {
  unexpectedPrismaErrors: number;
  suppressedRateLimitP2002: number;
}

interface GlobalPrismaCounters {
  __prismaErrorCounters?: PrismaErrorCounters;
}

const COUNTERS_KEY = "__prismaErrorCounters";

declare global {
  var __prismaErrorCounters: PrismaErrorCounters | undefined;
}

function counters(): PrismaErrorCounters {
  const g = globalThis as unknown as GlobalPrismaCounters;
  if (!g[COUNTERS_KEY]) {
    g[COUNTERS_KEY] = {
      unexpectedPrismaErrors: 0,
      suppressedRateLimitP2002: 0,
    };
  }
  return g[COUNTERS_KEY]!;
}

/** Called when an unexpected (non-rate-limit) Prisma error event fires. */
export function recordPrismaError(): void {
  counters().unexpectedPrismaErrors += 1;
}

/** Called when the expected rate-limit P2002 event is filtered out. */
export function recordSuppressedRateLimitP2002(): void {
  counters().suppressedRateLimitP2002 += 1;
}

/** Read-only snapshot of the counters (shallow copy). */
export function getPrismaErrorCounters(): PrismaErrorCounters {
  return { ...counters() };
}

/** Test hook: zero the counters (vitest workers may share globalThis). */
export function resetPrismaErrorCounters(): void {
  const g = globalThis as unknown as GlobalPrismaCounters;
  if (g[COUNTERS_KEY]) {
    g[COUNTERS_KEY]!.unexpectedPrismaErrors = 0;
    g[COUNTERS_KEY]!.suppressedRateLimitP2002 = 0;
  }
}
