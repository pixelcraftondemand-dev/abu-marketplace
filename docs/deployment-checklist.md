# Production Deployment Checklist

> **Target:** https://www.abumarketplace.shop (Vercel)
> **Purpose:** Ship every fix identified during production testing on 2026-08-08.
> **Status (2026-08-08 evening):** commits `9c1c801` + `88be23a` are pushed and
> the new build is LIVE; the prod Supabase DB is fully synced (zero drift). The
> only remaining catalog blocker is the Vercel `DATABASE_URL` env var (step 3).
> Tests: 44 files / 370 passing.

---

## 0. Pre-flight

- [ ] `git status --short` shows the working tree changes below (nothing staged yet).
- [ ] `npx vitest run` passes (currently **44 files / 370 tests**).
- [ ] `npm run build` passes locally **before** pushing (Prisma client must generate with the Postgres schema — see step 2).
- [ ] You have access to the Vercel project env vars and the Supabase SQL editor / direct DB URL.

---

## 1. Commit the working tree

The deployed build is stale (missing routes return 404, old CSP, empty catalog).
**One commit** containing the following is enough; they are grouped by the bug they fix.

### A. Catalog 500 — schema/provider fix (critical)
| File | Change |
|---|---|
| `prisma/schema.prisma` | datasource `provider = "sqlite"` → `"postgresql"` |
| `supabase/migrations/20260714133553_new-migration.sql` | was **0 bytes** → now the full baseline DDL (18 tables) |
| `supabase/migrations/20260806000000_payment_hardening.sql` | made idempotent |
| `supabase/migrations/20260806000001_support_token_hash.sql` | made idempotent (guarded rename) |
| `supabase/migrations/20260806000002_account_retention.sql` | made idempotent |

> ⚠️ Without the `provider = "postgresql"` change, Vercel's `prisma generate`
> rebuilds a **SQLite** client that cannot talk to Supabase Postgres — every DB
> call 500s. This is the #1 deploy blocker.

### B. Email OTP enforcement — Google OAuth must verify too
| File | Change |
|---|---|
| `app/api/auth/status/route.js` | **new** — `GET` returns `{ verified }` from the DB |
| `components/VerificationGate.jsx` | **new** — redirects unverified users to `/verify-email` |
| `app/[locale]/(public)/layout.jsx` | mounts the gate on all public pages |
| `components/store/StoreLayout.jsx` | mounts the gate (seller dashboard) |
| `components/admin/AdminLayout.jsx` | mounts the gate (admin) |
| `app/api/orders/route.js` | **all** payment methods now require a verified email (403) |
| `tests/api/auth-status.test.js` | **new** |
| `tests/api/orders.test.js` | updated |

> After this ships, a first-time Google sign-in is redirected to `/verify-email`
> and cannot shop until the OTP is entered. Existing unverified accounts are
> locked out until they verify (they can resend the code).

### C. `/api/translate`
| File | Change |
|---|---|
| `app/api/translate/route.js` | **new** — POST, validated, rate-limited |
| `lib/services/googleTranslateService.js` | **new** — Google Translate v2 wrapper |
| `lib/security.js` | adds `translateRateLimiter` |
| `tests/api/translate.test.js` + `tests/lib/googleTranslateService.test.js` | **new** |

### D. Exchange rates — Open Exchange Rates provider
| File | Change |
|---|---|
| `lib/services/exchangeRateService.js` | adds the `openexchangerates` provider + stale fallback |
| `tests/lib/exchangeRateService.test.js` | OER provider tests added; `source` assertion fixed |

> Prod currently serves **stale static rates** because `api.exchangerate.host`
> now requires an `access_key`. Set `OPEN_EXCHANGE_RATES_APP_ID` (step 3) or the
> rates stay permanently stale.

### E. CSP — strict nonce-based policy (no `unsafe-inline`/`unsafe-eval` in script-src)
| File | Change |
|---|---|
| `middleware.ts` | CSP rebuilt around a **per-request nonce**: `script-src 'self' 'nonce-…' 'strict-dynamic' https://clerk.abumarketplace.shop https://challenges.cloudflare.com` (no `unsafe-inline`, no `unsafe-eval` in prod — dev adds `unsafe-eval` only). CSP + `x-nonce` are forwarded as **request headers** so Next.js nonces its inline scripts and `<ClerkProvider dynamic>` nonces Clerk's script tag. `connect-src`/`frame-src` keep `https://*.accounts.dev` + the custom FAPI `https://clerk.abumarketplace.shop` (+ `wss:`) plus Clerk's Accounts portal `https://accounts.abumarketplace.shop` (`createRedirect` derives `accounts.<domain>` sign-in URLs), `https://challenges.cloudflare.com` for Turnstile. `style-src` retains `'unsafe-inline'` — required by Clerk's runtime CSS-in-JS and react-hot-toast (goober); it does not weaken script execution. `img-src` tightened to `images.unsplash.com` + `ik.imagekit.io` + `img.clerk.com` (was `https:`). `api.abumarketplace.shop`/Google-font origins removed (unused — `next/font` is self-hosted). |
| `app/layout.jsx` | `<ClerkProvider dynamic …>` (server-renders Clerk's `<script>` with the nonce) + `nonce` on the JSON-LD data block |
| `scripts/prod-smoke.sh` | CSP check now asserts `script-src` has a nonce + `strict-dynamic` and **no** `unsafe-inline`/`unsafe-eval`; `connect-src` must include Clerk (accounts.dev + custom domain) + `challenges.cloudflare.com` |

> Without the Clerk origins, sign-in redirects from wishlist/orders are refused
> by the browser ("violates Content-Security-Policy"). The `*.accounts.dev`
> wildcards do **not** cover the custom `clerk.abumarketplace.shop` domain — it
> must be listed explicitly in `connect-src` or every Clerk `/v1/*` fetch is
> blocked (verified 2026-08-09: script-src had it, connect-src did not).
>
> **Nonce mechanics (verified against Next.js 15):** all pages are dynamically
> rendered (root layout reads `cookies()`/`headers()`), so Next.js parses the
> `'nonce-…'` from the request CSP header and applies it to its inline RSC/
> bootstrap scripts automatically. Clerk's client JS is **not** bundled — it
> loads from `https://clerk.abumarketplace.shop/npm/@clerk/clerk-js@…/dist/clerk.browser.js`
> (hence the `script-src` host entry) and Turnstile's `api.js` from
> `https://challenges.cloudflare.com`; `strict-dynamic` lets the nonce'd Clerk
> script load Turnstile at runtime.

### F. Everything else that ships with the working tree
- Locale restructure `app/[locale]/` (fixes `/en/shop` 404, `app/(public)` deletions)
- `components/HalalCertifiedSection.jsx`, currency slice, i18n/locale utils, `lib/prisma.js`, `.env.example`
- Existing-but-undeployed routes: `/api/store/is-seller`, `/api/store/data` (currently 404 on prod)

### G. Distributed rate limiting — complete limiter inventory (24 limiters)

All state-changing / cost-bearing API endpoints are rate limited with a
**distributed, Postgres-backed** fixed-window limiter
(`createDistributedRateLimiter` in `lib/security.js`, store in
`lib/services/rateLimitStore.js`). The counters live in the `rate_limit_entry`
table, so limits hold across every serverless instance (in-memory Map limiters
would only count hits on one lambda). Keys are **namespaced per limiter**
(`{name}:{identifier}`) so two limiters never collide on the same row — a
user's checkout traffic can never count against their verification/rating
limits or vice versa.

| Limiter (export) | Namespace | Window | Limit | Routes | Key |
|---|---|---|---|---|---|
| `checkoutRateLimiter` | `checkout` | 60 s | 15 | `POST /api/orders` (checkout) | userId |
| `paymentStatusRateLimiter` | `payment-status` | 60 s | 30 | `GET /api/payments/status` | userId |
| `refundRateLimiter` | `refund` | 60 s | 20 | `POST /api/admin/refund` | userId |
| `webhookRateLimiter` | `webhook` | 60 s | 120 | `POST /api/flutterwave` (Flutterwave webhook) | hashIp |
| `walletTopupRateLimiter` | `wallet-topup` | 60 s | 10 | `POST /api/wallet/topup` | userId |
| `ratingRateLimiter` | `rating` | 60 s | 15 | `POST /api/rating` | userId |
| `verificationSendRateLimiter` | `verification-send` | 10 min | 3 | `POST /api/auth/send-verification` | userId |
| `verificationVerifyRateLimiter` | `verification-verify` | 10 min | 20 | `POST /api/auth/verify-email` | hashIp |
| `supportAIRateLimiter` | `support-ai` | 60 s | 20 | `POST /api/support/ai` | userId ‖ ip |
| `translateRateLimiter` | `translate` | 60 s | 30 | `POST /api/translate` | ip |
| `supportNotifyRateLimiter` | `support-notify` | 10 min | 5 | `POST /api/support/notify` | userId ‖ ip |
| `adminSupportReplyRateLimiter` | `admin-support-reply` | 60 s | 30 | `POST /api/admin/support-reply` | userId |
| `pdfRateLimiter` | `pdf` | 10 min | 10 | `POST /api/legal/pdf` | ip |
| `cartRateLimiter` | `cart` | 60 s | 60 | `POST /api/cart` | userId |
| `storeProductRateLimiter` | `store-product` | 60 s | 20 | `POST /api/store/product` | userId |
| `storeAIRateLimiter` | `store-ai` | 60 s | 10 | `POST /api/store/ai` (OpenAI) | userId |
| `storeCreateRateLimiter` | `store-create` | 10 min | 5 | `POST /api/store/create` | userId |
| `storeActionRateLimiter` | `store-action` | 60 s | 60 | `POST /api/store/stock-toggle`, `POST /api/store/orders` | userId |
| `adminActionRateLimiter` | `admin-action` | 60 s | 30 | `POST /api/store/approve`, `POST /api/admin/approve-store`, `POST /api/admin/toggle-store`, `POST`+`DELETE /api/admin/coupon`, `GET /api/admin/reconcile` | userId |
| `couponRateLimiter` | `coupon` | 60 s | 30 | `POST /api/coupon` | userId |
| `exchangeRateLimiter` | `exchange` | 60 s | 60 | `GET /api/exchange` (OER/upstream) | hashIp |
| `subscriptionCheckoutRateLimiter` | `subscription-checkout` | 60 s | 10 | `POST /api/subscriptions/checkout` | userId |
| `clerkWebhookRateLimiter` | `clerk-webhook` | 60 s | 120 | `POST /api/webhook/clerk` | hashIp |
| `addressRateLimiter` | `address` | 60 s | 30 | `POST /api/address` | userId |

**Mechanics (verified in prod, 2026-08-10):**
- Fixed bucket `floor(now / windowMs) * windowMs`; each check is an **atomic
  conditional increment** (`updateMany … count += 1` on `key + windowStart`),
  so concurrent lambdas can never double-count a bucket. A lost-insert race
  (P2002) is retried; a stale bucket is reset before incrementing. When the DB
  is unreachable the limiter degrades to a per-instance in-memory fallback
  (logged) so requests are never hard-failed by the limiter itself.
- Under vitest the limiter runs in-memory so `_clear()` fully resets state and
  the API tests never need a live database; the Postgres path is covered by
  `tests/lib/rateLimitStore.test.js` + the runtime hammer check below.
- Placement discipline: the check runs **after authentication, before any
  expensive work** — ImageKit uploads, OpenAI calls, Flutterwave hosted payment creation
  and external OER lookups are all blocked before cost is incurred.
- 429 responses are uniform: `{ "error": "Too many requests. Please try
  again later." }` with a `Retry-After` header (seconds to window roll).
- **Intentionally NOT distributed-limited:** read-only GET endpoints (public
  catalog `/api/products`, `/api/store/data`, wallet/auth status reads, admin
  dashboards) — the middleware IP throttle covers them, and DB-backed limits
  on public reads would self-DoS browsing. There is no `/api/search` route;
  search is the public `GET /api/products`.
- **Schema/migration:** `RateLimitEntry` in `prisma/schema.prisma` + migration
  `supabase/migrations/20260810000000_rate_limit_entries.sql`
  (`key` unique, `windowStart`, `count`, `@@index([windowStart])`).
- **Cleanup:** Inngest cron `cleanup-rate-limit-entries` runs every 15 min and
  deletes rows with `windowStart` older than 1 h (largest window is 10 min, so
  an hour is a safe margin).

---

## 2. Sync the production database (before/at deploy)

The prod Supabase DB is missing schema objects (`halalCertified` on
`Product`/`Store`, the `Rating` table, etc.) — this is what makes
`GET /api/products` 500.

```bash
# Generate the exact delta between the live DB and the schema.
# Use DIRECT_URL (direct connection), NOT the pgbouncer pooler URL.
npx prisma migrate diff \
  --from-url "$PROD_DIRECT_URL" \
  --shadow-database-url "$SHADOW_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

- [ ] Apply the generated SQL in the Supabase SQL editor (or via `prisma db push` against `DIRECT_URL`).
- [ ] Sanity: `prisma migrate diff` output is now **"This is an empty migration."**
- [ ] Do **not** run the baseline migration wholesale against a DB that already has tables.

---

## 3. Set environment variables (Vercel project settings)

> ⚠️ **#1 deploy blocker (verified 2026-08-08):** the deployed `DATABASE_URL`
> on Vercel must point at the **session pooler host `aws-1-us-west-1`**. The
> project's direct host `db.ptoztzrgdjxrdqkmarfu.supabase.co` is **IPv6-only**
> (unreachable from IPv4-only networks), and the old `aws-0-...pooler` format
> returns "tenant not found". With the schema now in sync, `/api/products`
> still 500s until `DATABASE_URL` is corrected — proven by running the exact
> build locally with each candidate URL (wrong host = 500 "Can't reach
> database server", correct host = 200 `{"products":[]}`).

| Variable | Value | Fixes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.ptoztzrgdjxrdqkmarfu:<password>@aws-1-us-west-1.pooler.supabase.com:5432/postgres` | **`/api/products` 500 (catalog)** |

> Note: `DIRECT_URL` on Vercel is inert (the schema has no `directUrl`). The
> real consumer is the **GitHub Actions secret** below.

- [ ] **GitHub → Settings → Secrets and variables → Actions:** add `PROD_DIRECT_URL`
      = the same session-pooler URL (used by the guarded DB-sync job in `deploy.yml`).
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **production** Clerk instance key | Clerk dev-key warnings |
| `CLERK_SECRET_KEY` | **production** Clerk instance key | same |
| `CLERK_WEBHOOK_SECRET` | prod webhook secret | webhook verification |
| `OPEN_EXCHANGE_RATES_APP_ID` | OER app id (or add `access_key` for exchangerate.host) | stale exchange rates |
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud Translate key | `/api/translate` 503 |
| `FLW_SECRET_KEY` | **live** Flutterwave secret key (`FLWSECK-...`) | checkout 502; app refuses to start on `FLWSECK_TEST-` in prod |
| `FLW_WEBHOOK_SECRET_HASH` | secret hash from Settings → Webhooks | webhook rejects without a matching `verif-hash` header |
| `NEXT_PUBLIC_APP_URL` | `https://www.abumarketplace.shop` | safe origin/CORS |
| `DATABASE_PROVIDER` | `postgresql` | (documentation of intent) |
| `VERIFICATION_EMAIL_FROM`, `EMAIL_FROM`, `SUPPORT_EMAIL_FROM` | verified Resend domains | OTP/order emails |

- [ ] **Apply the rate-limit migration too** (new table, additive):
      `supabase/migrations/20260810000000_rate_limit_entries.sql` — creates
      `rate_limit_entry` (`key` unique, `windowStart`, `count`, index on
      `windowStart`). Without it, every limiter check 500s → the in-memory
      fallback engages and rate limiting silently becomes per-instance. Run it
      in the Supabase SQL editor alongside the schema delta in step 2 (or add
      `npx prisma migrate deploy` once the baseline is resolved).
      **The deploy pipeline now does this automatically:** the guarded `db-sync`
      job in `deploy.yml` generates the delta from the Prisma schema (which
      includes `RateLimitEntry`), applies it, then runs
      `scripts/verify-db-tables.mjs rate_limit_entry` to confirm the table
      exists on prod — so a missed migration fails the deploy loudly instead of
      silently degrading to in-memory limiting.
- [ ] `_prisma_migrations` is currently empty (the prod delta was applied via raw SQL, not `prisma migrate`). No runtime impact. If you ever adopt `prisma migrate deploy`, first baseline the live schema: `npx prisma migrate resolve --applied 20260714133553_new-migration` (and the other four).
- [ ] Clerk dashboard: instance must be a **Production** instance, with Google OAuth enabled, and the app URL set to `https://www.abumarketplace.shop`.
- [ ] Resend: verify `verification.abumarketplace.shop` (and the main domain) so OTP emails deliver.

---

## 4. Deploy

- [ ] Commit everything from step 1.
- [ ] Push to `main` (Vercel auto-deploys from the repo).
- [ ] Confirm the Vercel build ran `prisma generate` against the **postgresql** schema (no SQLite errors).

---

## 5. Post-deploy verification

```bash
B=https://www.abumarketplace.shop

# CANONICAL — the full smoke battery (the exact checks the deploy pipeline
# runs post-deploy). Exit 0 = all hard checks pass, incl. the rate-limiter
# gate (#11) and the prisma-noise check (#12).
BASE_URL="$B" bash scripts/prod-smoke.sh

curl -s  $B/api/health                     # {"ok":true}
curl -s  $B/api/products                   # 200 {"products":[...]}   <-- was 500
curl -s  $B/api/products?sort=featured     # 200
curl -s  "$B/api/products/p_bogus"         # 404, NOT 500
curl -s  "$B/api/exchange?base=USD&symbols=EUR,SLL"   # source:"openexchangerates" (or non-stale), was fallback
curl -s -X POST $B/api/translate -H 'content-type: application/json' \
  -d '{"text":"Hello","target":"fr"}'      # 200 { translatedText, ... }
curl -s  $B/api/store/is-seller            # 401 not authorized (was 404 — route now exists)
curl -s  $B/api/store/data                 # 400 missing username (was 404)
curl -s -o /dev/null -w '%{http_code}' $B/en/shop     # 200 (locale routes live)
curl -s -o /dev/null -w '%{http_code}' $B/api/auth/status  # 401 (endpoint exists)

# Rate limiter — CANONICAL check: scripts/rate-limit-smoke.sh hammers
# /api/exchange from TEST-NET IP 198.51.100.99 with base=NOTREAL (the limiter
# runs before currency validation, so each hit is a fast 400 with zero
# upstream OER cost) and asserts a 429 with Retry-After after ~60 hits in one
# fixed 60s window. It loops to 125 so a window-boundary roll can't false-
# fail. Exit 0 = PASS or WARN, exit 1 = FAIL. This is the same gate the
# deploy pipeline runs — no need to hand-roll the loop.
bash scripts/rate-limit-smoke.sh
# expect: PASS /api/exchange -> 429 after ~61 hits (rate limiter enforcing, Retry-After: N)
# (if a run in the same 60s window already exhausted the bucket it PASSes on
#  hit 1 — that additionally proves the shared counter persisted.)

# Prisma log-noise: assert ZERO unexpected prisma:error events after the
# hammer (canonical: check #12 inside scripts/prod-smoke.sh). Directly, the
# app exposes per-instance counters at GET /api/health/prisma
# (lib/prismaErrorCounters.js): `suppressedRateLimitP2002` > 0 is the
# expected concurrent-create filter working; `unexpectedPrismaErrors` must
# stay 0.
curl -s "$B/api/health/prisma"
# {"unexpectedPrismaErrors":0,"suppressedRateLimitP2002":0|N}
```

> **Canonical:** the rate-limiter gate (`scripts/rate-limit-smoke.sh`) and the
> full battery (`BASE_URL="$B" bash scripts/prod-smoke.sh`, checks #11 + #12)
> run automatically in the deploy pipeline's smoke job — prefer them over
> hand-rolled curls.

- [ ] **Browser:** sign in with Google as a new user → expect redirect to `/verify-email`, an OTP email arrives, entering the code unlocks the site. Verify the "Clerk has been loaded with development keys" warning is gone from the console.
- [ ] **Browser:** wishlist → sign-in redirect does NOT throw a CSP "Refused to connect" error.
- [ ] **Browser:** homepage + `/shop` show product cards (previously empty).
- [ ] Prices render from live rates (not the `stale: true` fallback).

---

## 6. Rollback

- [ ] Vercel: redeploy the previous successful production commit (one click).
- [ ] DB changes (additive: new columns/tables) are safe to leave; no destructive
      migration is included in this checklist.
