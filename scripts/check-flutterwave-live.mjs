#!/usr/bin/env node
// Flutterwave live-mode guard.
//
// Fails loudly if FLW_SECRET_KEY starts with FLWSECK_TEST- while NODE_ENV is
// production, so a live deploy can never accidentally run on Flutterwave test
// keys (checkout would "work" in test mode but no real money ever moves).
//
// Usage:
//   NODE_ENV=production FLW_SECRET_KEY=FLWSECK-... node scripts/check-flutterwave-live.mjs
//
// Wired into:
//   - instrumentation.ts (runtime — throws on server start in prod)
//   - .github/workflows/ci.yml (self-test: test keys must trip, live keys pass)
//
// Exit codes: 0 = safe to run, 1 = test key detected in production.
const NODE_ENV = process.env.NODE_ENV;
const key = process.env.FLW_SECRET_KEY || "";

let failed = false;

if (NODE_ENV === "production") {
  if (key.startsWith("FLWSECK_TEST-")) {
    console.error(
      "FATAL: FLW_SECRET_KEY starts with FLWSECK_TEST- in production. " +
        "Live deployments must use a live key (FLWSECK-...). " +
        "Set the live key in the platform environment variables before deploying."
    );
    failed = true;
  } else if (!key) {
    console.warn(
      "WARN: FLW_SECRET_KEY is not set. Payment creation will fail at runtime " +
        "until it is configured — but this is not a test/live key mismatch."
    );
  }
}

if (failed) {
  process.exit(1);
}
console.log(`Flutterwave key mode check passed (NODE_ENV=${NODE_ENV || "(unset)"}).`);
process.exit(0);
