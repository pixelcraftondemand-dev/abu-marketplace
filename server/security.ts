import type { Express, Request, Response, NextFunction } from 'express';

// ----------------------------------------------------
// Consistent hardening layer shared by every route:
// - Security headers incl. CSP / HSTS (HTTPS is terminated at the proxy)
// - Origin check so browsers cannot be tricked into cross-site state changes
// - A compact per-IP rate limiter (the in-memory one server.ts used to expose)
// - Input sanitizers used to normalise every user-controlled field
// ----------------------------------------------------

const BLOCKED_CONTROL_CHARS = /[\u0000-\u001F\u007F\u2028\u2029]/g;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const HTML_TAGS = /<\/?[a-z][^>]*>/gi;

export function sanitizeText(value: unknown, max = 200): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(BLOCKED_CONTROL_CHARS, '')
    .replace(ZERO_WIDTH, '')
    .replace(HTML_TAGS, '')
    .trim()
    .slice(0, max);
}

export function sanitizeLongText(value: unknown, max = 2000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(BLOCKED_CONTROL_CHARS, '')
    .replace(ZERO_WIDTH, '')
    .trim()
    .slice(0, max);
}

export function sanitizePhone(value: unknown, max = 24): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/[^\d+ ()-]/g, '').trim();
  return cleaned.slice(0, max);
}

/** Only allow locally-served product/asset paths, or well-behaved https media URLs. */
export function sanitizeImageAsset(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const v = value.trim();
  if (/^\/(products|images|src\/assets)\/[\w./-]+\.(jpg|jpeg|png|webp|svg)$/i.test(v)) return v;
  if (/^https:\/\/[\w.-]+\/[\w./-]+$/i.test(v) && v.length <= 400) return v;
  return fallback;
}

export function sanitizeNumber(value: unknown, fallback: number, max = 10_000_000): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

/** Picks a safe list of keys out of an arbitrary JSON body (prevents mass assignment). */
export function pickAllowed<T extends Record<string, any>>(body: any, keys: readonly string[]): T {
  const out: Record<string, any> = {};
  if (body && typeof body === 'object') {
    for (const key of keys) {
      if (body[key] !== undefined) out[key] = body[key];
    }
  }
  return out as T;
}

// ----------------------------------------------------
// Rate limiting
// ----------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_RATE_LIMIT_ENTRIES = 10_000;

// Prune expired entries occasionally so long-running processes stay bounded.
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPrune = Date.now();
function pruneExpired(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

export function clientIp(req: Request): string {
  // Express derives this using the configured trusted-proxy count. Do not trust
  // the raw forwarded header, which clients can spoof when sent directly.
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Applies a fixed-window limit for `identity` (typically ip:route or user:route).
 * Returns false and sends a 429 response when the caller is over their budget.
 */
export function rateLimit(req: Request, res: Response, routeKey: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  pruneExpired(now);
  const key = `${req.originalUrl.split('?')[0]}|${routeKey}|${clientIp(req)}`;
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey) rateLimitMap.delete(oldestKey);
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({ success: false, error: 'Too many requests. Please slow down and try again shortly.' });
    return false;
  }
  entry.count += 1;
  return true;
}

// ----------------------------------------------------
// Security headers & CSRF-style origin enforcement
// ----------------------------------------------------

const clerkOrigin = (() => {
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  const encodedFrontendApi = publishableKey?.match(/^pk_(?:test|live)_(.+)$/)?.[1];
  if (!encodedFrontendApi) return '';

  const frontendApi = Buffer.from(encodedFrontendApi, 'base64').toString('utf8').replace(/\$$/, '');
  return /^[a-z0-9.-]+$/i.test(frontendApi) ? ` https://${frontendApi}` : '';
})();

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // Vite injects inline bootstraps; Clerk, fonts, and Google endpoints are documented needs.
  `script-src 'self' 'unsafe-inline' https://accounts.google.com${clerkOrigin}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `font-src 'self' data: https://fonts.gstatic.com${clerkOrigin}`,
  "img-src 'self' data: blob: https://api.dicebear.com https:",
  "worker-src 'self' blob:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googleapis.com https://fonts.googleapis.com https://api.dicebear.com https://api.abumarketplace.shop wss://*.loca.lt https://*.run.app${clerkOrigin}`,
  `frame-src 'self' https://accounts.google.com${clerkOrigin}`,
  `form-action 'self'${clerkOrigin}`,
  "frame-ancestors 'self'",
  'base-uri \'self\'',
  'object-src \'none\'',
].join('; ');

/**
 * Browsers attach `Origin` to every state-changing request originating from a page.
 * If the origin does not match the deployment host, reject: classic CSRF defence in
 * depth (Authorization-header auth already keeps tokens out of auto-attached cookies).
 */
function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.origin as string | undefined;
  if (!origin) return true; // Non-browser clients (curl, server-to-server) send no Origin.

  // The host the deployment identifies as (proxy header wins when present).
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
  if (!host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host || originHost.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export function applySecurity(app: Express): void {
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    // HSTS only makes sense for https deployments; harmless behind a TLS proxy.
    if (
      process.env.NODE_ENV === 'production' ||
      req.headers['x-forwarded-proto'] === 'https'
    ) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      req.method !== 'OPTIONS' &&
      req.originalUrl.startsWith('/api') &&
      !isAllowedOrigin(req)
    ) {
      return res.status(403).json({ success: false, error: 'Cross-site request rejected' });
    }
    next();
  });

  // In production require https at the edge; redirect accidental http requests.
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const proto = req.headers['x-forwarded-proto'];
      if (proto && proto !== 'https' && req.method === 'GET') {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        return res.redirect(308, `https://${host}${req.originalUrl}`);
      }
      next();
    });
  }
}
