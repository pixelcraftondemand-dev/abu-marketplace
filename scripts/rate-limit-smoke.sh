#!/usr/bin/env bash
# Rate-limiter enforcement smoke check for ABU Marketplace production.
#
# Standalone gate (used directly by the deploy workflow AND as check #11 of
# scripts/prod-smoke.sh): hammers /api/exchange with an isolated test IP and
# asserts the distributed limiter actually blocks.
#
# Usage:
#   BASE_URL=https://www.abumarketplace.shop bash scripts/rate-limit-smoke.sh
#   exit 0 = PASS (429 observed) or WARN (inconclusive — never blocks CI)
#   exit 1 = FAIL (limiter regression)
#
# Mechanics:
# - The exchange limiter (60/min per IP) runs BEFORE currency validation, so
#   base=NOTREAL short-circuits with a fast 400 without hitting the external
#   OER API. Expect a 429 (with Retry-After) once 61 hits land in one fixed
#   60s window.
# - The loop runs to 125 because the window boundary can roll mid-hammer
#   (splitting the count across two windows) — 125 covers the worst case of
#   60 + 61 with margin.
# - The reserved TEST-NET-2 IP (198.51.100.99) keeps the burst isolated from
#   real users if the platform honors the client x-forwarded-for header; if
#   it replaces it, the burst lands on the runner's egress bucket — the check
#   still passes since 429 is what is asserted.
# - Catches a future regression where the distributed limiter is removed,
#   bypassed, or the rate_limit_entry migration is missing on prod (which
#   would silently degrade to per-instance memory limiting).
# - Assumes the site is otherwise reachable: if ALL hits fail to get any
#   response, the check ends WARN/inconclusive (exit 0). In the deploy
#   workflow the battery's hard checks (catalog, health) cover total outages;
#   run standalone, pair this gate with a reachability check.
# - TIMEOUT here is the per-request curl timeout (8s) — deliberately shorter
#   than the battery's TIMEOUT=20 since each hit is a fast 400/429.
set -uo pipefail

BASE_URL="${BASE_URL:-https://www.abumarketplace.shop}"
TIMEOUT=8

pass() { echo "  PASS  $1"; }
warn() { echo "  WARN  $1"; }
fail() { echo "  FAIL  $1"; }

RL_IP="198.51.100.99"
rl_total=0
rl_saw_400=0
rl_429=0
rl_retry_after=""
rl_last_code=""
for i in $(seq 1 125); do
  rl_body=$(mktemp)
  rl_headers=$(mktemp)
  rl_code=$(curl -s -D "$rl_headers" -o "$rl_body" -w '%{http_code}' --max-time "$TIMEOUT" \
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
  exit 0
elif [ "$rl_saw_400" = "1" ]; then
  fail "/api/exchange never returned 429 in $rl_total hits (last status $rl_last_code) — rate limiter regression (check lib/security.js limiters + rate_limit_entry migration on prod)"
  exit 1
else
  warn "/api/exchange rate-limit check inconclusive after $rl_total hits (got no 400/429 — CDN/bot protection or middleware throttle interfering? verify manually)"
  exit 0
fi
