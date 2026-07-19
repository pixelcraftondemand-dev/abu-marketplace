import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
      "https://clerk.abumarketplace.shop",
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
    ],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": ["'self'", "data:", "https:", "blob:"],
    "connect-src": [
      "'self'",
      "https://*.clerk.accounts.dev",
      "https://api.abumarketplace.shop",
      "wss://*.clerk.accounts.dev",
    ],
    "frame-src": ["'self'", "https://*.clerk.accounts.dev"],
    "media-src": ["'self'", "https:"],
    "object-src": ["'none'"],
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
  "/cart/checkout",
  "/api/store(.*)",
  "/api/admin(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/products(.*)",
  "/api/shop(.*)",
  "/api/search(.*)",
]);

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

  // ─── Authentication Check ───
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // ─── Build Response with Security Headers ───
  const response = NextResponse.next();

  // Content Security Policy
  response.headers.set("Content-Security-Policy", buildCSP());

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // XSS Protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );

  // HSTS (HTTPS Strict Transport Security)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Cache control for sensitive pages
  if (isProtectedRoute(req)) {
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // CORS headers for API routes
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (origin && SECURITY_CONFIG.allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With"
      );
      response.headers.set("Access-Control-Max-Age", "86400");
    }
  }

  // Remove server fingerprinting headers
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");

  // Additional security headers
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

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