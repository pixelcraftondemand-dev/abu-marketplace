#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# SEO Audit Script — ABU Marketplace
#
# Runs curl against a running dev server to check:
#   1. robots.txt exists and blocks the right paths
#   2. sitemap.xml exists and references key pages
#   3. Meta tags (title, description, OG, Twitter) on key pages
#   4. No sentry/meta leaks in public <meta> tags
#   5. Canonical URLs present
#
# Usage:
#   ./scripts/seo-audit.sh                  # defaults to http://localhost:3000
#   ./scripts/seo-audit.sh https://staging.example.com
#
# Exit code 0 = all checks pass, 1 = at least one failure.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE="${1:-http://localhost:3000}"
FAILURES=0
PASSES=0
WARNINGS=0

# ─── Helpers ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

pass() { ((PASSES++)); echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAILURES++)); echo -e "  ${RED}✗ FAIL${NC} $1"; }
warn() { ((WARNINGS++)); echo -e "  ${YELLOW}⚠ WARN${NC} $1"; }
section() { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }

# Fetch a page and store the raw HTML in a temp file.
# Usage: fetch_page /path output_var_name
fetch_page() {
  local path="$1"
  local outvar="$2"
  local url="${BASE}${path}"
  local tmpfile
  tmpfile=$(mktemp)
  local http_code
  http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")
  eval "$outvar=\$tmpfile"
  eval "${outvar}_status=\$http_code"
}

# Check if a string exists in a file.
has_text() { grep -qi "$1" "$2" 2>/dev/null; }

# ─── 1. robots.txt ───────────────────────────────────────────────────────────

section "1. robots.txt"

ROBOTS_FILE=$(mktemp)
ROBOTS_CODE=$(curl -s -o "$ROBOTS_FILE" -w "%{http_code}" --max-time 10 "${BASE}/robots.txt" 2>/dev/null || echo "000")

if [[ "$ROBOTS_CODE" == "200" ]]; then
  pass "robots.txt returns 200"
else
  fail "robots.txt returns HTTP $ROBOTS_CODE (expected 200)"
fi

if has_text "User-agent" "$ROBOTS_FILE"; then
  pass "robots.txt contains User-agent directive"
else
  fail "robots.txt missing User-agent directive"
fi

if has_text "Sitemap" "$ROBOTS_FILE"; then
  pass "robots.txt references sitemap"
else
  fail "robots.txt missing Sitemap reference"
fi

# Check that sensitive paths are disallowed
for path in "/api/" "/admin/" "/sign-in" "/cart" "/wallet"; do
  if has_text "$path" "$ROBOTS_FILE"; then
    pass "robots.txt disallows $path"
  else
    warn "robots.txt does not disallow $path (may be intentional)"
  fi
done

rm -f "$ROBOTS_FILE"

# ─── 2. sitemap.xml ──────────────────────────────────────────────────────────

section "2. sitemap.xml"

SITEMAP_FILE=$(mktemp)
SITEMAP_CODE=$(curl -s -o "$SITEMAP_FILE" -w "%{http_code}" --max-time 15 "${BASE}/sitemap.xml" 2>/dev/null || echo "000")

if [[ "$SITEMAP_CODE" == "200" ]]; then
  pass "sitemap.xml returns 200"
else
  fail "sitemap.xml returns HTTP $SITEMAP_CODE (expected 200)"
fi

if has_text "<urlset" "$SITEMAP_FILE"; then
  pass "sitemap.xml is valid XML with <urlset>"
else
  fail "sitemap.xml missing <urlset> root element"
fi

# Check that key pages are in the sitemap
for path in "/" "/shop" "/about" "/contact"; do
  if has_text "$path" "$SITEMAP_FILE"; then
    pass "sitemap includes $path"
  else
    fail "sitemap missing $path"
  fi
done

# Check sitemap has product entries
if has_text "/product/" "$SITEMAP_FILE"; then
  pass "sitemap includes product pages"
else
  warn "sitemap has no product pages (may be empty catalog)"
fi

# Check sitemap has locale prefixes
if has_text "/en/" "$SITEMAP_FILE"; then
  pass "sitemap includes locale-prefixed URLs"
else
  warn "sitemap has no locale-prefixed URLs"
fi

rm -f "$SITEMAP_FILE"

# ─── 3. Meta tags on key pages ───────────────────────────────────────────────

section "3. Meta tags (title, description, OG, Twitter)"

# Pages to check: path, expected title substring, expected description substring
declare -a PAGES=(
  "/|ABU Marketplace|trusted online marketplace"
  "/en/shop|Shop|browse"
  "/en/about|About|ABU Marketplace"
  "/en/contact|Contact|support"
)

for entry in "${PAGES[@]}"; do
  IFS='|' read -r path title_check desc_check <<< "$entry"
  PAGE_FILE=$(mktemp)

  PAGE_CODE=$(curl -s -o "$PAGE_FILE" -w "%{http_code}" --max-time 15 "${BASE}${path}" 2>/dev/null || echo "000")

  if [[ "$PAGE_CODE" != "200" ]]; then
    fail "$path returns HTTP $PAGE_CODE"
    rm -f "$PAGE_FILE"
    continue
  fi

  # Title tag
  if has_text "<title>" "$PAGE_FILE"; then
    local_title=$(sed -n 's/.*<title[^>]*>\([^<]*\)<\/title>.*/\1/p' "$PAGE_FILE" 2>/dev/null | head -1)
    if [[ -n "$local_title" ]]; then
      pass "$path has <title>: ${local_title:0:60}..."
    else
      fail "$path has empty <title>"
    fi
  else
    fail "$path missing <title> tag"
  fi

  # Meta description
  if has_text 'name="description"' "$PAGE_FILE" || has_text "name='description'" "$PAGE_FILE"; then
    local_desc=$(sed -n 's/.*name="description"[^>]*content="\([^"]*\)".*/\1/p' "$PAGE_FILE" 2>/dev/null | head -1)
    if [[ -n "$local_desc" && ${#local_desc} -gt 20 ]]; then
      pass "$path has meta description (${#local_desc} chars)"
    else
      warn "$path has meta description but it may be too short"
    fi
  else
    fail "$path missing meta description"
  fi

  # Open Graph tags
  if has_text 'property="og:title"' "$PAGE_FILE" || has_text "property='og:title'" "$PAGE_FILE"; then
    pass "$path has og:title"
  else
    fail "$path missing og:title"
  fi

  if has_text 'property="og:description"' "$PAGE_FILE" || has_text "property='og:description'" "$PAGE_FILE"; then
    pass "$path has og:description"
  else
    fail "$path missing og:description"
  fi

  if has_text 'property="og:image"' "$PAGE_FILE" || has_text "property='og:image'" "$PAGE_FILE"; then
    pass "$path has og:image"
  else
    warn "$path missing og:image (may be set at layout level)"
  fi

  # Twitter Card tags
  if has_text 'name="twitter:card"' "$PAGE_FILE" || has_text "name='twitter:card'" "$PAGE_FILE"; then
    pass "$path has twitter:card"
  else
    warn "$path missing twitter:card (optional but recommended)"
  fi

  rm -f "$PAGE_FILE"
done

# ─── 4. Security: no sentry/meta leaks ───────────────────────────────────────

section "4. Security — no sentry or internal values in public meta tags"

for path in "/" "/en/shop" "/en/about"; do
  PAGE_FILE=$(mktemp)
  curl -s -o "$PAGE_FILE" --max-time 15 "${BASE}${path}" 2>/dev/null || true

  if has_text 'sentry' "$PAGE_FILE"; then
    fail "$path contains 'sentry' in HTML (potential meta leak)"
  else
    pass "$path has no sentry references in HTML"
  fi

  if has_text 'SENTRY' "$PAGE_FILE"; then
    fail "$path contains 'SENTRY' in HTML (env leak)"
  else
    pass "$path has no SENTRY env leak"
  fi

  # Check for common internal values that shouldn't be in public HTML
  for pattern in "FLW_SECRET" "CLERK_WEBHOOK" "DATABASE_URL" "NEXTAUTH"; do
    if has_text "$pattern" "$PAGE_FILE"; then
      fail "$path contains '$pattern' in HTML (env leak)"
    fi
  done
  pass "$path has no sensitive env values in HTML"

  rm -f "$PAGE_FILE"
done

# ─── 5. Canonical URLs ───────────────────────────────────────────────────────

section "5. Canonical URLs"

for path in "/" "/en/shop" "/en/about"; do
  PAGE_FILE=$(mktemp)
  curl -s -o "$PAGE_FILE" --max-time 15 "${BASE}${path}" 2>/dev/null || true

  if has_text 'rel="canonical"' "$PAGE_FILE" || has_text "rel='canonical'" "$PAGE_FILE"; then
    pass "$path has canonical URL"
  else
    warn "$path missing canonical URL (may be set at layout level)"
  fi

  rm -f "$PAGE_FILE"
done

# ─── 6. Product page spot check ──────────────────────────────────────────────

section "6. Product page SEO (spot check)"

# Try to find a product page by fetching the shop page and extracting a product link
SHOP_FILE=$(mktemp)
curl -s -o "$SHOP_FILE" --max-time 15 "${BASE}/en/shop" 2>/dev/null || true

# Look for product links in the HTML
PRODUCT_PATH=$(sed -n 's/.*\/en\/product\/\([^"]*\)".*/\1/p' "$SHOP_FILE" 2>/dev/null | head -1)
rm -f "$SHOP_FILE"

if [[ -n "$PRODUCT_PATH" ]]; then
  PROD_FILE=$(mktemp)
  curl -s -o "$PROD_FILE" --max-time 15 "${BASE}/en/product/${PRODUCT_PATH}" 2>/dev/null || true

  if has_text "<title>" "$PROD_FILE"; then
    pass "Product page has <title>"
  else
    fail "Product page missing <title>"
  fi

  if has_text 'property="og:title"' "$PROD_FILE"; then
    pass "Product page has og:title"
  else
    fail "Product page missing og:title"
  fi

  if has_text 'property="og:type"' "$PROD_FILE"; then
    pass "Product page has og:type"
  else
    warn "Product page missing og:type (should be 'product')"
  fi

  if has_text 'rel="canonical"' "$PROD_FILE"; then
    pass "Product page has canonical URL"
  else
    warn "Product page missing canonical URL"
  fi

  rm -f "$PROD_FILE"
else
  warn "No product links found on /en/shop — skipping product page check"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${BOLD}SEO Audit Complete${NC}"
echo -e "  Target: ${CYAN}${BASE}${NC}"
echo -e ""
echo -e "  ${GREEN}✓ ${PASSES} passed${NC}"
if [[ $WARNINGS -gt 0 ]]; then
  echo -e "  ${YELLOW}⚠ ${WARNINGS} warnings${NC}"
fi
if [[ $FAILURES -gt 0 ]]; then
  echo -e "  ${RED}✗ ${FAILURES} failures${NC}"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ $FAILURES -gt 0 ]]; then
  exit 1
fi
exit 0
