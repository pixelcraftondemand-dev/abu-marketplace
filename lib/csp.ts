/**
 * Content-Security-Policy builder.
 *
 * Extracted from middleware.ts for testability and reuse. The nonce is
 * per-request (Web Crypto) and must be generated in the middleware, but
 * the policy string itself is pure logic.
 */

const SITE_SALT = "abu-marketplace-device-v1";

/**
 * Build the Content-Security-Policy header string.
 *
 * script-src uses nonce + strict-dynamic for framework/Clerk scripts.
 * style-src keeps unsafe-inline for Clerk CSS-in-JS + react-hot-toast.
 */
export function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const csp: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://clerk.abumarketplace.shop",
      "https://challenges.cloudflare.com",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://challenges.cloudflare.com",
    ],
    "font-src": ["'self'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://images.unsplash.com",
      "https://ik.imagekit.io",
      "https://img.clerk.com",
    ],
    "connect-src": [
      "'self'",
      "https://*.clerk.accounts.dev",
      "https://*.accounts.dev",
      "https://clerk.abumarketplace.shop",
      "wss://clerk.abumarketplace.shop",
      "wss://*.clerk.accounts.dev",
      "wss://*.accounts.dev",
      "https://accounts.abumarketplace.shop",
      "https://challenges.cloudflare.com",
    ],
    "frame-src": [
      "'self'",
      "https://*.clerk.accounts.dev",
      "https://*.accounts.dev",
      "https://clerk.abumarketplace.shop",
      "https://accounts.abumarketplace.shop",
      "https://challenges.cloudflare.com",
    ],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(csp)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");
}

/**
 * Generate a fresh CSP nonce per request (Web Crypto — works on Edge + Node).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
