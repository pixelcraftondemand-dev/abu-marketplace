import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLocaleFromPath, stripLocaleFromPath, getPreferredLocaleFromAcceptLanguage, supportedLocales, defaultLocale, Locale } from "@/lib/utils/locale";
import { buildCSP, generateNonce } from "@/lib/csp";
import { redis, isRedisAvailable } from "@/lib/redis";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 100; // max requests per window

const ALLOWED_ORIGINS = [
  "https://abumarketplace.shop",
  "https://www.abumarketplace.shop",
];

const WEBHOOK_PATHS = new Set(["/api/webhook/clerk"]);
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// ─── Redis-backed Rate Limiting ─────────────────────────────────────────────

/**
 * Distributed rate limiter using Upstash Redis.
 * Falls back to per-instance in-memory when Redis is unavailable.
 */
const rateLimitMemory = new Map<string, number[]>();

async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  if (isRedisAvailable) {
    try {
      const key = `rl:middleware:${ip}`;
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - RATE_LIMIT_WINDOW;
      const bucketKey = `${key}:${Math.floor(now / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW}`;

      const count = await redis.incr(bucketKey);
      if (count === 1) {
        await redis.expire(bucketKey, RATE_LIMIT_WINDOW);
      }

      if (count > RATE_LIMIT_MAX) {
        const retryAfter = RATE_LIMIT_WINDOW - (now % RATE_LIMIT_WINDOW);
        return { allowed: false, retryAfter };
      }
      return { allowed: true };
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }

  // In-memory fallback (single-instance only)
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW * 1000;
  const requests = rateLimitMemory.get(ip) || [];
  const valid = requests.filter((t) => t > windowStart);

  if (valid.length >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((valid[0] + RATE_LIMIT_WINDOW * 1000 - now) / 1000);
    return { allowed: false, retryAfter };
  }

  valid.push(now);
  rateLimitMemory.set(ip, valid);
  return { allowed: true };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function isTrustedMutationOrigin(req: NextRequest): boolean {
  if (!req.nextUrl.pathname.startsWith("/api/") || !UNSAFE_METHODS.has(req.method)) return true;
  if (WEBHOOK_PATHS.has(req.nextUrl.pathname)) return true;

  const origin = req.headers.get("origin");
  if (!origin) return false;

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const trusted = new Set([
    ...ALLOWED_ORIGINS,
    "http://localhost:3000",
    ...(configuredOrigin ? [configuredOrigin] : []),
  ]);
  return trusted.has(origin);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

function ipMatchesEntry(ip: string, entry: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed) return false;
  const slash = trimmed.indexOf("/");
  if (slash === -1) return ip === trimmed;
  const range = trimmed.slice(0, slash);
  const bits = Number(trimmed.slice(slash + 1));
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function isAdminIpAllowed(ip: string): boolean {
  const allowlist = (process.env.ADMIN_IP_ALLOWLIST || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (allowlist.length === 0) return true;
  return allowlist.some((entry) => ipMatchesEntry(ip, entry));
}

// ─── Route Matchers ─────────────────────────────────────────────────────────

const isProtectedRoute = createRouteMatcher([
  "/store(.*)", "/admin(.*)", "/agent(.*)",
  "/orders(.*)", "/wishlist", "/account", "/cart/checkout",
  "/api/store(.*)", "/api/admin(.*)", "/api/agent(.*)",
]);

const isPublicStoreDataRoute = createRouteMatcher(["/api/store/data"]);

const isPublicApiRoute = createRouteMatcher([
  "/api/products(.*)", "/api/shop(.*)", "/api/search(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

const NON_LOCALIZED_PREFIXES = [
  "/api", "/sign-in", "/sign-up", "/store", "/admin", "/terms", "/landing", "/monitoring",
];

function isNonLocalizedPath(pathname: string): boolean {
  return NON_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function resolveLocale(pathname: string, req: NextRequest): string {
  const fromPath = getLocaleFromPath(pathname);
  if (fromPath) return fromPath;
  const cookieLocale = req.cookies.get("marketplaceLocale")?.value;
  if (cookieLocale && (supportedLocales as readonly string[]).includes(cookieLocale)) return cookieLocale as Locale;
  return getPreferredLocaleFromAcceptLanguage(req.headers.get("accept-language")) || defaultLocale;
}

// ─── Main Middleware ────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const ip = getClientIP(req);
  const nonce = generateNonce();

  // CSRF: reject untrusted mutation origins
  if (!isTrustedMutationOrigin(req)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  // Rate limiting for API routes
  if (isPublicApiRoute(req) || pathname.startsWith("/api/")) {
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests", retryAfter: rateLimit.retryAfter }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateLimit.retryAfter) } }
      );
    }
  }

  // Admin IP allowlist (second layer over Clerk auth)
  if (isAdminRoute(req) && !isAdminIpAllowed(ip)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ─── Locale Routing ─────────────────────────────────────────────────────
  const localePath = getLocaleFromPath(req.nextUrl.pathname);
  const routePath = localePath ? stripLocaleFromPath(req.nextUrl.pathname) : req.nextUrl.pathname;

  let response: NextResponse;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("Content-Security-Policy", buildCSP(nonce));
  requestHeaders.set("x-nonce", nonce);

  if (localePath) {
    if (isNonLocalizedPath(routePath)) {
      const redirect = NextResponse.redirect(
        new URL(`${routePath}${req.nextUrl.search}`, req.url)
      );
      redirect.headers.set("Content-Security-Policy", buildCSP(nonce));
      redirect.headers.set("x-nonce", nonce);
      return redirect;
    }
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else if (!isNonLocalizedPath(req.nextUrl.pathname)) {
    const locale = resolveLocale(req.nextUrl.pathname, req);
    response = NextResponse.rewrite(
      new URL(`/${locale}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url),
      { request: { headers: requestHeaders } }
    );
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Set locale cookie
  const resolvedLocale = localePath || resolveLocale(req.nextUrl.pathname, req);
  const currentLocaleCookie = req.cookies.get("marketplaceLocale")?.value;
  if (currentLocaleCookie !== resolvedLocale) {
    response.cookies.set("marketplaceLocale", resolvedLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Clerk auth protection
  if (
    !isPublicStoreDataRoute(req) &&
    isProtectedRoute({ ...req, nextUrl: new URL(`http://localhost${routePath}`) } as NextRequest)
  ) {
    await auth.protect();
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)",
    "/(api|trpc)(.*)",
  ],
};
