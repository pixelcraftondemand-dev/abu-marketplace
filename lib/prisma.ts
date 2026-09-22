import { PrismaClient } from '@prisma/client';
import { isExpectedRateLimitP2002 } from '@/lib/prismaLogFilter';
import {
  recordPrismaError,
  recordSuppressedRateLimitP2002,
} from '@/lib/prismaErrorCounters';
import { reportPrismaErrorToSentry } from '@/lib/prismaErrorReporter';
import { formatPrismaQueryLog } from '@/lib/prismaQueryLog';

// ─── Global type augmentation ──────────────────────────────────────────────
// The prisma singleton is cached on globalThis to survive hot-reloads in dev
// and avoid creating multiple PrismaClient instances in serverless functions.

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaLogHandlersInstalled: boolean | undefined;
}

const globalForPrisma = globalThis;

const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Event-based logging so we can quiet the expected rate-limit P2002
    // (see isExpectedRateLimitP2002). Everything else logs as before.
    log: [
      { emit: 'event' as const, level: 'warn' as const },
      { emit: 'event' as const, level: 'error' as const },
      ...(process.env.NODE_ENV === 'development'
        ? ([{ emit: 'event' as const, level: 'query' as const }])
        : []),
    ],
  } as any);

// Register the log handlers exactly once (guarded by the global singleton).
// Cast $on to any because PrismaClient's event-based log type inference
// narrows the event parameter to `never` when the log config uses `as const`.
if (!globalForPrisma.__prismaLogHandlersInstalled) {
  const on = prisma.$on.bind(prisma) as (event: string, cb: (e: any) => void) => void;
  if (process.env.NODE_ENV === 'development') {
    on('query', (e) => {
      // Keep the same detail the old array-form ['query'] config provided
      // (see formatPrismaQueryLog — params is already a JSON string).
      console.log(formatPrismaQueryLog(e));
    });
  }
  on('warn', (e) => {
    console.warn(`[prisma:warn] ${e.message}`);
  });
  on('error', (e) => {
    if (isExpectedRateLimitP2002(e)) {
      // Expected race — count it so the smoke battery can tell the filtered
      // path is working (see lib/prismaErrorCounters.js + check #12 in
      // scripts/prod-smoke.sh). The counter must increment in ALL environments;
      // only the console line is dev-only so prod stays quiet (Sentry is not
      // involved here — this is a handled, expected path).
      recordSuppressedRateLimitP2002();
      if (process.env.NODE_ENV !== 'production') {
        console.log('[rate-limit] concurrent bucket create (P2002) — expected, handled');
      }
      return;
    }
    recordPrismaError();
    console.error(`[prisma:error] ${e.message}`);
    // The event carries no stack — surface the genuine error to Sentry so
    // error monitoring covers the stack-loss tradeoff of event-based
    // logging (see lib/prismaErrorReporter.js). Fire-and-forget.
    reportPrismaErrorToSentry(e);
  });
  globalForPrisma.__prismaLogHandlersInstalled = true;
}

globalForPrisma.prisma = prisma;

export default prisma;
