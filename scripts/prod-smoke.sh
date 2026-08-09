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

# 10. CSP connect-src must allow both Clerk's accounts.dev wildcards AND the
# custom frontend API domain (clerk.abumarketplace.shop) — the wildcards do
# NOT cover the custom domain, so a missing entry blocks every Clerk fetch
# ("Refused to connect ... violates the document's Content Security Policy").
# Only the connect-src directive is inspected: script-src also lists
# clerk.abumarketplace.shop, so grepping the whole header would false-pass.
csp=$(curl -s -D - -o /dev/null --max-time "$TIMEOUT" "$BASE_URL/" | grep -i content-security-policy | tr -d '\r')
connect_src=$(printf '%s\n' "$csp" | sed -n 's/.*connect-src \([^;]*\).*/\1/p')
if printf '%s' "$connect_src" | grep -q 'clerk.abumarketplace.shop' && printf '%s' "$connect_src" | grep -q 'accounts.dev'; then
  pass "CSP connect-src includes accounts.dev + clerk.abumarketplace.shop"
else
  warn "CSP connect-src missing accounts.dev or clerk.abumarketplace.shop (check middleware.ts on prod)"
fi

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "SMOKE: all hard checks passed."
  exit 0
else
  echo "SMOKE: $FAILURES hard check(s) failed."
  exit 1
fi
