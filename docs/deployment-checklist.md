# Production Deployment Checklist

> **Target:** https://www.abumarketplace.shop (Vercel)
> **Purpose:** Ship every fix identified during production testing on 2026-08-08.
> **Status (2026-08-08 evening):** commits `9c1c801` + `88be23a` are pushed and
> the new build is LIVE; the prod Supabase DB is fully synced (zero drift). The
> only remaining catalog blocker is the Vercel `DATABASE_URL` env var (step 3).
> Tests: 41 files / 351 passing.

---

## 0. Pre-flight

- [ ] `git status --short` shows the working tree changes below (nothing staged yet).
- [ ] `npx vitest run` passes (currently **40 files / 341 tests**).
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

### E. CSP — Clerk `accounts.dev` + locale routing
| File | Change |
|---|---|
| `middleware.ts` | CSP `connect-src`/`frame-src`/`script-src` now include `https://*.accounts.dev`; locale rewrite + non-localized prefixes |

> Without this, Clerk sign-in redirects from wishlist/orders are refused by the
> browser ("violates Content-Security-Policy").

### F. Everything else that ships with the working tree
- Locale restructure `app/[locale]/` (fixes `/en/shop` 404, `app/(public)` deletions)
- `components/HalalCertifiedSection.jsx`, currency slice, i18n/locale utils, `lib/prisma.js`, `.env.example`
- Existing-but-undeployed routes: `/api/store/is-seller`, `/api/store/data` (currently 404 on prod)

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
| `NEXT_PUBLIC_APP_URL` | `https://www.abumarketplace.shop` | safe origin/CORS |
| `DATABASE_PROVIDER` | `postgresql` | (documentation of intent) |
| `VERIFICATION_EMAIL_FROM`, `EMAIL_FROM`, `SUPPORT_EMAIL_FROM` | verified Resend domains | OTP/order emails |

- [ ] `_prisma_migrations` is currently empty (the prod delta was applied via raw SQL, not `prisma migrate`). No runtime impact. If you ever adopt `prisma migrate deploy`, first baseline the live schema: `npx prisma migrate resolve --applied 20260714133553_new-migration` (and the other three).
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
curl -s  $B/api/health                     # {"ok":true}
curl -s  $B/api/products                   # 200 {"products":[...]}   <-- was 500
curl -s  $B/api/products?sort=featured     # 200
curl -s  "$B/api/products/p_bogus"         # 404, NOT 500
curl -s  "$B/api/exchange?base=USD&symbols=EUR,SLE"   # source:"openexchangerates" (or non-stale), was fallback
curl -s -X POST $B/api/translate -H 'content-type: application/json' \
  -d '{"text":"Hello","target":"fr"}'      # 200 { translatedText, ... }
curl -s  $B/api/store/is-seller            # 401 not authorized (was 404 — route now exists)
curl -s  $B/api/store/data                 # 400 missing username (was 404)
curl -s -o /dev/null -w '%{http_code}' $B/en/shop     # 200 (locale routes live)
curl -s -o /dev/null -w '%{http_code}' $B/api/auth/status  # 401 (endpoint exists)
```

- [ ] **Browser:** sign in with Google as a new user → expect redirect to `/verify-email`, an OTP email arrives, entering the code unlocks the site. Verify the "Clerk has been loaded with development keys" warning is gone from the console.
- [ ] **Browser:** wishlist → sign-in redirect does NOT throw a CSP "Refused to connect" error.
- [ ] **Browser:** homepage + `/shop` show product cards (previously empty).
- [ ] Prices render from live rates (not the `stale: true` fallback).

---

## 6. Rollback

- [ ] Vercel: redeploy the previous successful production commit (one click).
- [ ] DB changes (additive: new columns/tables) are safe to leave; no destructive
      migration is included in this checklist.
