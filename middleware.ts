import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLocaleFromPath, stripLocaleFromPath, getPreferredLocaleFromAcceptLanguage, supportedLocales, defaultLocale } from "@/lib/utils/locale";

// ─── Types ───
interface RateLimitEntry {
  requests: number[];
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

// ─── Configuration ───
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX = 100; // max requests per window

// ─── Rate Limiting Store ───
// In production, replace with Redis (e.g., Upstash, Redis Cloud)
const rateLimitStore = new Map<string, number[]>();

// ─── Security Configuration ───
interface SecurityConfig {
  csp: Record<string, string[]>;
  allowedOrigins: string[];
}

const SECURITY_CONFIG: SecurityConfig = {
  csp: {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://*.clerk.accounts.dev",
      "https://*.accounts.dev",
      "https://clerk.abumarketplace.shop",
      // Clerk CAPTCHA (Cloudflare Turnstile) requires this host
      "https://challenges.cloudflare.com",
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://challenges.cloudflare.com",
    ],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": ["'self'", "data:", "https:", "blob:"],
    "connect-src": [
      "'self'",
      "https://*.clerk.accounts.dev",
      "https://*.accounts.dev",
      "https://api.abumarketplace.shop",
      "wss://*.clerk.accounts.dev",
      "wss://*.accounts.dev",
      "https://challenges.cloudflare.com",
    ],
    "frame-src": [
      "'self'",
      "https://*.clerk.accounts.dev",
      "https://*.accounts.dev",
      "https://challenges.cloudflare.com",
    ],
    "media-src": ["'self'", "https:"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  },
  allowedOrigins: [
    "https://abumarketplace.shop",
    "https://www.abumarketplace.shop",
  ],
};

// ─── Helper Functions ───

/**
 * Build Content-Security-Policy header string from config
 */
function buildCSP(): string {
  return Object.entries(SECURITY_CONFIG.csp)
    .map(([key, values]: [string, string[]]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");
}

/**
 * Check if request is within rate limit
 * @param ip - Client IP address
 * @returns RateLimitResult with allowed status and optional retryAfter
 */
function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Get or initialize request history for this IP
  const requests = rateLimitStore.get(ip) || [];

  // Filter out requests outside the current window
  const validRequests = requests.filter((time: number) => time > windowStart);

  // Check if limit exceeded
  if (validRequests.length >= RATE_LIMIT_MAX) {
    const oldestRequest = validRequests[0];
    const retryAfter = Math.ceil((oldestRequest + RATE_LIMIT_WINDOW - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Add current request and update store
  validRequests.push(now);
  rateLimitStore.set(ip, validRequests);

  return { allowed: true };
}

/**
 * Get client IP from request headers
 * @param req - NextRequest object
 * @returns Client IP string
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || (req as any).ip || "unknown";
}

// ─── Cleanup Job ───
// Remove old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  for (const [ip, requests] of rateLimitStore.entries()) {
    const valid = requests.filter((time: number) => time > windowStart);
    if (valid.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, valid);
    }
  }
}, 5 * 60 * 1000);

// ─── Route Matchers ───
const isProtectedRoute = createRouteMatcher([
  "/store(.*)",
  "/admin(.*)",
  "/orders(.*)",
  "/wishlist",
  "/account",
  "/cart/checkout",
  "/api/store(.*)",
  "/api/admin(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/products(.*)",
  "/api/shop(.*)",
  "/api/search(.*)",
]);

// Routes that intentionally live at the app root and must never receive a
// locale prefix (auth, seller/admin dashboards, legal page, API, Sentry).
const NON_LOCALIZED_PREFIXES = [
  "/api",
  "/sign-in",
  "/sign-up",
  "/store",
  "/admin",
  "/terms",
  "/landing",
  "/monitoring",
];

function isNonLocalizedPath(pathname: string): boolean {
  return NON_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Resolve the active locale: an explicit path prefix wins, then the
 * marketplaceLocale cookie, then the browser's Accept-Language, then default.
 */
function resolveLocale(pathname: string, req: NextRequest): string {
  const fromPath = getLocaleFromPath(pathname);
  if (fromPath) return fromPath;
  const cookieLocale = req.cookies.get("marketplaceLocale")?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale)) return cookieLocale;
  return getPreferredLocaleFromAcceptLanguage(req.headers.get("accept-language")) || defaultLocale;
}

/**
 * Apply the full set of security headers to a response. Used for both normal
 * responses and the early canonical-locale redirects.
 */
function applySecurityHeaders(response: NextResponse, req: NextRequest, pathname: string, routePath: string) {
  response.headers.set("Content-Security-Policy", buildCSP());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Cache control for sensitive pages
  if (isProtectedRoute({ ...req, nextUrl: new URL(`http://localhost${routePath}`) } as NextRequest)) {
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // CORS headers for API routes
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (origin && SECURITY_CONFIG.allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      response.headers.set("Access-Control-Max-Age", "86400");
    }
  }

  // Remove server fingerprinting headers
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");

  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
}

// ─── Main Middleware ───
export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const ip = getClientIP(req);

  // ─── Rate Limiting for API Routes ───
  if (isPublicApiRoute(req) || pathname.startsWith("/api/")) {
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfter),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
            "X-RateLimit-Window": String(RATE_LIMIT_WINDOW / 1000),
          },
        }
      );
    }
  }

  // ─── Locale Routing ───
  // Public pages live under app/[locale]/(public). Locale-prefixed URLs are
  // served natively by the [locale] dynamic segment; unprefixed public URLs
  // are rewritten into the resolved locale so /shop -> /en/shop.
  const localePath = getLocaleFromPath(req.nextUrl.pathname);
  const routePath = localePath ? stripLocaleFromPath(req.nextUrl.pathname) : req.nextUrl.pathname;

  let response: NextResponse;
  if (localePath) {
    if (isNonLocalizedPath(routePath)) {
      // A locale prefix must never be applied to non-localized routes (auth,
      // seller/admin dashboards, API, legal). Redirect /fr/sign-in -> /sign-in
      // so those routes keep a single canonical URL. Returned before the
      // protected-route check so Clerk never overrides the redirect; the
      // canonical target runs its own auth on the next hop.
      const redirect = NextResponse.redirect(
        new URL(`${routePath}${req.nextUrl.search}`, req.url)
      );
      applySecurityHeaders(redirect, req, req.nextUrl.pathname, routePath);
      return redirect;
    }
    response = NextResponse.next();
  } else if (!isNonLocalizedPath(req.nextUrl.pathname)) {
    const locale = resolveLocale(req.nextUrl.pathname, req);
    response = NextResponse.rewrite(
      new URL(`/${locale}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url)
    );
  } else {
    response = NextResponse.next();
  }

  const resolvedLocale = localePath || resolveLocale(req.nextUrl.pathname, req);
  const currentLocaleCookie = req.cookies.get("marketplaceLocale")?.value;
  if (currentLocaleCookie !== resolvedLocale) {
    response.cookies.set("marketplaceLocale", resolvedLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  if (
    isProtectedRoute({ ...req, nextUrl: new URL(`http://localhost${routePath}`) } as NextRequest)
  ) {
    await auth.protect();
  }

  // ─── Build Response with Security Headers ───
  applySecurityHeaders(response, req, pathname, routePath);

  return response;
});

// ─── Middleware Config ───
export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};