# Testing and release checklist for the Sierra Leone pilot

This project already uses a strong Vitest base and a route smoke runner under `tests/e2e/run.js`. This document extends that foundation for the pilot week and keeps the ops work light enough to run before Wednesday.

## Tier 1: required before the pilot

### 1) Unit tests

Run the focused suite:

```bash
npm run test:unit
```

Key areas already covered by the repo are:
- OTP and verification flows in `tests/lib/verificationService.test.js`
- WhatsApp number normalization and wa.me link generation in `tests/lib/whatsapp.test.js`
- security and rate-limit regression tests in `tests/api/security-hardening.test.js`
- feature flags in `tests/lib/featureFlags.test.js`

### 2) Integration tests

```bash
npm run test:integration
```

This reuses the existing API test suite under `tests/api` and `tests/inngest`.

### 3) E2E smoke and pilot flow

```bash
npm run test:e2e
```

This project already ships an end-to-end sandbox runner at `tests/e2e/run.js` using Puppeteer. It is the right place to keep a quick pilot smoke check before Wednesday.

### 4) Security scan and secret scan

```bash
npm run test:security
```

This script runs:
- `npm audit --audit-level=high`
- a repo scan for hardcoded secrets such as AWS/AWS keys, Google API keys, and private key material

### 5) Smoke tests after deploy

```bash
npm run test:smoke
```

### 6) Load test scaffold

```bash
npm run test:load
```

The k6 scaffold lives at `tests/load/pilot-load.js`. The threshold is `p95 < 800 ms` for HTTP requests and error rate under 1%.

## Tier 2: scaffolded for after launch

These are intentionally documented but not blocking launch:
- contract tests for the API
- regression suite tagging
- soak and spike tests
- chaos tests for WhatsApp/API outages and DB slowness
- axe accessibility checks
- localization checks
- mutation testing and threshold reporting
- cross-browser runs
- canary/staged rollout notes

## Pilot pre-launch checklist

- [ ] `npm run test:unit` passes
- [ ] `npm run test:integration` passes
- [ ] `npm run test:security` passes
- [ ] `npm run test:smoke` passes against the deployment candidate
- [ ] `npm run test:e2e` passes on a mobile viewport
- [ ] `OTP_PROVIDER` is set to `mock` for pilot, unless a live provider is required
- [ ] `PAYMENTS_ONLINE_ENABLED` is disabled until the pilot payment path is verified
- [ ] `OLD_LOGIN_FALLBACK` is reviewed before switch-over
- [ ] `/api/health` returns 200 in staging and production
- [ ] Uptime checks are enabled in UptimeRobot or equivalent
- [ ] No secret material is committed; use `.env.local` and CI secrets only

## Bug and risk report from the audit

### Critical
- The repo did not have a centralized feature-flag surface for release safety. This is now added via `lib/featureFlags.ts`.

### High
- The pilot needed an explicit smoke and security script stack; these were missing from the package entry points and not documented in a single place.

### Medium
- The existing e2e coverage is a custom smoke harness rather than a modern Playwright runner; the repo now keeps the route smoke runner and exposes a clear test matrix around it.

## Required release controls

Set these in the environment before the pilot:

```bash
OTP_PROVIDER=mock
PAYMENTS_ONLINE_ENABLED=false
OLD_LOGIN_FALLBACK=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> Do not commit secrets to the repo. Use GitHub Actions secrets or your local `.env.local` file only.
