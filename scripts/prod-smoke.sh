#!/usr/bin/env bash
# Post-deploy smoke battery for ABU Marketplace production.
#
# Mirrors the "Post-deploy verification" section of docs/deployment-checklist.md.
# Exits non-zero if any hard check fails.
#
# Usage:
#   BASE_URL=https://www.abumarketplace.shop scripts/prod-smoke.sh
#
# Env:
#   BASE_URL   target origin (default https://www.abumarketplace.shop)
set -uo pipefail

BASE_URL="${BASE_URL:-https://www.abumarketplace.shop}"
TIMEOUT=20
FAILURES=0

pass() { echo "  PASS  $1"; }
warn() { echo "  WARN  $1"; }
fail() { echo "  FAIL  $1"; FAILURES=$((FAILURES + 1)); }

status() {
  curl -s -o /tmp/smoke-body.txt -w '%{http_code}' --max-time "$TIMEOUT" "$@"
}

echo "== Smoke battery against $BASE_URL =="

# 1. Health (no DB)
code=$(status "$BASE_URL/api/health")
if [ "$code" = "200" ] && grep -q '"ok":true' /tmp/smoke-body.txt; then
  pass "/api/health -> 200"
else
  fail "/api/health -> $code (expected 200 {\"ok\":true})"
fi

# 2. Catalog — the critical one (was 500 on prod)
code=$(status "$BASE_URL/api/products")
if [ "$code" = "200" ] && grep -q '"products"' /tmp/smoke-body.txt; then
  pass "/api/products -> 200 with products"
else
  fail "/api/products -> $code (expected 200 {\"products\":[...]})"
fi

# 3. Featured sort
code=$(status "$BASE_URL/api/products?sort=featured")
if [ "$code" = "200" ]; then
  pass "/api/products?sort=featured -> 200"
else
  fail "/api/products?sort=featured -> $code (expected 200)"
fi

# 4. Bogus product id -> 404 (NOT 500)
code=$(status "$BASE_URL/api/products/p_bogus123")
if [ "$code" = "404" ]; then
  pass "/api/products/p_bogus123 -> 404"
elif [ "$code" = "500" ]; then
  fail "/api/products/p_bogus123 -> 500 (catalog regression — check DB schema sync)"
else
  warn "/api/products/p_bogus123 -> $code (expected 404)"
fi

# 5. Exchange rates — must not be the stale fallback
code=$(status "$BASE_URL/api/exchange?base=USD&symbols=EUR,SLE")
if [ "$code" = "200" ]; then
  if grep -q '"stale":true' /tmp/smoke-body.txt; then
    warn "/api/exchange -> 200 but STALE (OPEN_EXCHANGE_RATES_APP_ID not set on prod?)"
  elif grep -qE '"(source|provider)":' /tmp/smoke-body.txt; then
    pass "/api/exchange -> 200, live rates"
  else
    pass "/api/exchange -> 200"
  fi
else
  fail "/api/exchange -> $code (expected 200)"
fi

# 6. Translate — route must exist; 503 = key not configured yet
code=$(status -X POST "$BASE_URL/api/translate" -H 'content-type: application/json' -d '{"text":"Hello","target":"fr"}')
if [ "$code" = "200" ]; then
  pass "/api/translate -> 200"
elif [ "$code" = "503" ]; then
  warn "/api/translate -> 503 (GOOGLE_TRANSLATE_API_KEY not set on prod — route is live)"
elif [ "$code" = "429" ]; then
  warn "/api/translate -> 429 (rate-limited, endpoint is live)"
else
  fail "/api/translate -> $code (expected 200)"
fi

# 7. Store routes that used to 404. Signed-out requests to protected
# /api/store/* routes are rewritten by Clerk to the sign-in page (200 HTML
# with X-Clerk-Auth-Reason: protect-rewrite) — that IS the auth gate working.
# 401 = signed-out user rejected by the handler; 500 = server error (DB down).
code=$(curl -s -o /tmp/smoke-body.txt -w '%{http_code}' --max-time "$TIMEOUT" "$BASE_URL/api/store/is-seller")
clerk_reason=$(curl -sI --max-time "$TIMEOUT" "$BASE_URL/api/store/is-seller" | grep -i x-clerk-auth-reason | tr -d '\r')
if [ "$code" = "401" ] || echo "$clerk_reason" | grep -q 'protect-rewrite'; then
  pass "/api/store/is-seller -> protected (route exists, auth-gated)"
elif [ "$code" = "500" ]; then
  fail "/api/store/is-seller -> 500 (server error — check DB reachability on prod)"
else
  fail "/api/store/is-seller -> $code (expected 401 or Clerk protect-rewrite)"
fi

code=$(curl -s -o /tmp/smoke-body.txt -w '%{http_code}' --max-time "$TIMEOUT" "$BASE_URL/api/store/data")
clerk_reason=$(curl -sI --max-time "$TIMEOUT" "$BASE_URL/api/store/data" | grep -i x-clerk-auth-reason | tr -d '\r')
if [ "$code" = "401" ] || echo "$clerk_reason" | grep -q 'protect-rewrite'; then
  pass "/api/store/data -> protected (route exists)"
elif [ "$code" = "500" ]; then
  fail "/api/store/data -> 500 (server error — check DB reachability on prod)"
else
  fail "/api/store/data -> $code (expected 401 or Clerk protect-rewrite)"
fi

# 8. Auth status endpoint (new)
code=$(status "$BASE_URL/api/auth/status")
if [ "$code" = "401" ] || [ "$code" = "200" ]; then
  pass "/api/auth/status -> $code (endpoint exists)"
else
  fail "/api/auth/status -> $code (expected 401 unauthenticated)"
fi

# 9. Locale route
code=$(status "$BASE_URL/en/shop")
if [ "$code" = "200" ]; then
  pass "/en/shop -> 200"
else
  fail "/en/shop -> $code (expected 200, locale routes live)"
fi

# 10. CSP must be strict: script-src is nonce + strict-dynamic with NO
# unsafe-inline/unsafe-eval (production build never uses eval). connect-src
# must allow Clerk's accounts.dev wildcards AND the custom frontend API domain
# (clerk.abumarketplace.shop — the wildcards do NOT cover it; a missing entry
# blocks every Clerk fetch) plus challenges.cloudflare.com for Turnstile.
csp=$(curl -s -D - -o /dev/null --max-time "$TIMEOUT" "$BASE_URL/" | grep -i content-security-policy | tr -d '\r')
script_src=$(printf '%s\n' "$csp" | sed -n 's/.*script-src \([^;]*\).*/\1/p')
connect_src=$(printf '%s\n' "$csp" | sed -n 's/.*connect-src \([^;]*\).*/\1/p')
if printf '%s' "$script_src" | grep -q "'nonce-" && printf '%s' "$script_src" | grep -q 'strict-dynamic'; then
  if printf '%s' "$script_src" | grep -q 'unsafe-inline\|unsafe-eval'; then
    warn "CSP script-src still contains unsafe-inline or unsafe-eval (should be nonce + strict-dynamic only)"
  else
    pass "CSP script-src strict: nonce + strict-dynamic, no unsafe-inline/unsafe-eval"
  fi
else
  warn "CSP script-src missing nonce or strict-dynamic (check middleware.ts on prod)"
fi
if printf '%s' "$connect_src" | grep -q 'clerk.abumarketplace.shop' && printf '%s' "$connect_src" | grep -q 'accounts.dev' && printf '%s' "$connect_src" | grep -q 'accounts.abumarketplace.shop' && printf '%s' "$connect_src" | grep -q 'challenges.cloudflare.com'; then
  pass "CSP connect-src includes Clerk (accounts.dev + clerk.abumarketplace.shop + accounts portal) + challenges.cloudflare.com"
else
  warn "CSP connect-src missing accounts.dev, clerk.abumarketplace.shop, accounts.abumarketplace.shop or challenges.cloudflare.com (check middleware.ts on prod)"
fi

# 11. Rate limiter enforcement — hammer /api/exchange with an isolated test IP.
# The exchange limiter (60/min per IP) runs BEFORE currency validation, so
# base=NOTREAL short-circuits with a fast 400 without hitting the external OER
# API. Expect a 429 (with Retry-After) once 61 hits land in one fixed 60s
# window. The loop runs to 125 because the window boundary can roll mid-hammer
# (splitting the count across two windows) — 125 covers the worst case of
# 60 + 61 with margin. The reserved TEST-NET-2 IP (198.51.100.99) keeps the
# burst isolated from real users if the platform honors the client
# x-forwarded-for header; if it replaces it, the burst lands on the runner's
# egress bucket — the check still passes since 429 is what is asserted. This
# catches a future regression where the distributed limiter is removed,
# bypassed, or the rate_limit_entry migration is missing on prod (which would
# silently degrade to per-instance memory limiting).
RL_IP="198.51.100.99"
rl_total=0
rl_saw_400=0
rl_429=0
rl_retry_after=""
rl_last_code=""
for i in $(seq 1 125); do
  rl_body=$(mktemp)
  rl_headers=$(mktemp)
  rl_code=$(curl -s -D "$rl_headers" -o "$rl_body" -w '%{http_code}' --max-time 8 \
    -H "x-forwarded-for: $RL_IP" "$BASE_URL/api/exchange?base=NOTREAL")
  rl_total=$((rl_total + 1))
  rl_last_code="$rl_code"
  if [ "$rl_code" = "400" ]; then
    rl_saw_400=1
  elif [ "$rl_code" = "429" ]; then
    rl_429=1
    rl_retry_after=$(grep -i '^retry-after' "$rl_headers" | tr -d '\r' | awk '{print $2}' | head -1)
    rm -f "$rl_body" "$rl_headers"
    break
  fi
  rm -f "$rl_body" "$rl_headers"
done
if [ "$rl_429" = "1" ]; then
  pass "/api/exchange -> 429 after $rl_total hits (rate limiter enforcing, Retry-After: ${rl_retry_after:-?})"
elif [ "$rl_saw_400" = "1" ]; then
  fail "/api/exchange never returned 429 in $rl_total hits (last status $rl_last_code) — rate limiter regression (check lib/security.js limiters + rate_limit_entry migration on prod)"
else
  warn "/api/exchange rate-limit check inconclusive after $rl_total hits (got no 400/429 — CDN/bot protection or middleware throttle interfering? verify manually)"
fi

# 12. No prisma:error noise after the hammer. The smoke runner cannot read
# Vercel's runtime logs, so the app exposes per-instance counters at
# GET /api/health/prisma (see lib/prismaErrorCounters.js):
#   { unexpectedPrismaErrors, suppressedRateLimitP2002 }
# `unexpectedPrismaErrors` MUST stay 0 — the P2002-on-rollover noise was
# removed by design (rateLimitStore.checkDb reset-before-create + the event
# filter in lib/prisma.js), so any positive count here is a regression the
# hammer above would have triggered. `suppressedRateLimitP2002` > 0 is
# HEALTHY (the concurrent-create filter working). Fetch a few times because
# serverless requests can land on different instances — the hammer pins one
# warm instance, and we take the max unexpected count across fetches.
pe_max_unexpected=0
pe_suppressed=0
pe_seen=0
for i in 1 2 3 4 5; do
  pe_body=$(mktemp)
  pe_code=$(curl -s -o "$pe_body" -w '%{http_code}' --max-time "$TIMEOUT" "$BASE_URL/api/health/prisma")
  if [ "$pe_code" = "200" ] && grep -q '"unexpectedPrismaErrors"' "$pe_body"; then
    pe_seen=$((pe_seen + 1))
    pe_unexpected=$(sed -n 's/.*"unexpectedPrismaErrors"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' "$pe_body")
    pe_supp=$(sed -n 's/.*"suppressedRateLimitP2002"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' "$pe_body")
    if [ -n "$pe_unexpected" ] && [ "$pe_unexpected" -gt "$pe_max_unexpected" ]; then
      pe_max_unexpected="$pe_unexpected"
    fi
    if [ -n "$pe_supp" ] && [ "$pe_supp" -gt "$pe_suppressed" ]; then
      pe_suppressed="$pe_supp"
    fi
  fi
  rm -f "$pe_body"
done
if [ "$pe_seen" -gt 0 ]; then
  if [ "$pe_max_unexpected" -eq 0 ]; then
    pass "/api/health/prisma -> 0 unexpected prisma errors after hammer (from $pe_seen instance fetch(es); suppressed rate-limit P2002: $pe_suppressed)"
  else
    fail "/api/health/prisma -> $pe_max_unexpected unexpected prisma:error event(s) after the hammer — rate-limit noise regression OR a genuine DB error; check Vercel runtime logs (if rate-limit noise: lib/prisma.js event filter + lib/services/rateLimitStore.js checkDb)"
  fi
else
  warn "/api/health/prisma unreachable (route not live on this deployment yet?) — prisma-error-noise check skipped"
fi

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "SMOKE: all hard checks passed."
  exit 0
else
  echo "SMOKE: $FAILURES hard check(s) failed."
  exit 1
fi
