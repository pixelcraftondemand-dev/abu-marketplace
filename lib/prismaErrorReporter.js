/**
 * Sends UNEXPECTED Prisma error events to Sentry via captureException.
 *
 * Background: lib/prisma.js uses event-based logging (instead of the old
 * array-form `log: ['error']`) so the expected rate-limit P2002 can be
 * filtered to one info line. The tradeoff: Prisma error events carry a
 * `message` but no JS stack, so genuine errors previously lost their stack
 * trace in the log. This reporter covers that gap — every unexpected error
 * event is captured as a Sentry exception with the event context attached,
 * so error monitoring keeps the diagnostics that the log line no longer has.
 *
 * Mirrors the lib/paymentLog.js pattern: dynamic import + fire-and-forget,
 * never blocks or breaks the payment/DB path. The expected rate-limit P2002
 * is filtered out BEFORE this is called (see lib/prismaLogFilter.js), so it
 * never reaches Sentry.
 *
 * Note: `captureException` fires for every error event — including ones a
 * route catches and handles gracefully (which `captureRequestError` never
 * sees — that is the coverage this reporter guarantees). For UNHANDLED
 * request errors, instrumentation.ts's `captureRequestError` also captures
 * the real error with its stack; Sentry's `dedupe` integration may collapse
 * the overlap (same message), but differing stacks/extras can keep them
 * separate. That redundancy is tolerated by design.
 */
export function reportPrismaErrorToSentry(event) {
  return import("@sentry/nextjs")
    .then(({ captureException }) => {
      captureException(new Error(event?.message || "Prisma error event"), {
        extra: {
          prismaTarget: event?.target,
          prismaEventTimestamp: event?.timestamp,
        },
        tags: { source: "prisma-event" },
      });
    })
    .catch(() => {
      // Sentry must never take down the request path.
    });
}
