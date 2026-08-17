import * as Sentry from "@sentry/nextjs";

/**
 * Fail loudly if production is configured with a Flutterwave TEST key. A live
 * deploy running on FLWSECK_TEST- silently does zero real charges — the
 * checkout "works" but no money moves. Throw so the server refuses to start.
 *
 * Skipped during `next build` (NEXT_PHASE=phase-production-build) so local
 * builds with test keys in .env still work; enforced at runtime/server start.
 * Mirrors scripts/check-flutterwave-live.mjs.
 */
function assertFlutterwaveLiveMode() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    const key = process.env.FLW_SECRET_KEY || "";
    if (key.startsWith("FLWSECK_TEST-")) {
      throw new Error(
        "FLW_SECRET_KEY starts with FLWSECK_TEST- in production. " +
          "Set the live key (FLWSECK-...) in the platform environment variables before deploying."
      );
    }
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    assertFlutterwaveLiveMode();
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
