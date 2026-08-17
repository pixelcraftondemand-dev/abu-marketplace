import { PrismaClient } from '@prisma/client';
import { isExpectedRateLimitP2002 } from '@/lib/prismaLogFilter';
import {
  recordPrismaError,
  recordSuppressedRateLimitP2002,
} from '@/lib/prismaErrorCounters';
import { reportPrismaErrorToSentry } from '@/lib/prismaErrorReporter';
import { formatPrismaQueryLog } from '@/lib/prismaQueryLog';

const globalForPrisma = globalThis;
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Event-based logging so we can quiet the expected rate-limit P2002
    // (see isExpectedRateLimitP2002). Everything else logs as before.
    log: [
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
      ...(process.env.NODE_ENV === 'development' ? [{ emit: 'event', level: 'query' }] : []),
    ],
  });

// Register the log handlers exactly once (guarded by the global singleton).
if (!globalForPrisma.__prismaLogHandlersInstalled) {
  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
      // Keep the same detail the old array-form ['query'] config provided
      // (see formatPrismaQueryLog — params is already a JSON string).
      console.log(formatPrismaQueryLog(e));
    });
  }
  prisma.$on('warn', (e) => {
    console.warn(`[prisma:warn] ${e.message}`);
  });
  prisma.$on('error', (e) => {
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
