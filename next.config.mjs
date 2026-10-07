import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
    },
    // During the TS migration, legacy `.js` files import `@/lib/foo.js` where
    // the file is now `foo.ts`. Mirror tsconfig's bundler resolution so webpack
    // maps `.js` requests onto `.ts`/`.tsx` siblings.
    webpack: (config) => {
        config.resolve.extensionAlias = {
            '.js': ['.ts', '.tsx', '.js', '.jsx'],
            '.mjs': ['.mts', '.mjs'],
            '.cjs': ['.cts', '.cjs'],
        };
        return config;
    },
    // Locale routing is handled by middleware.ts + the app/[locale] segment.
    headers: async () => [
        {
            // Static security headers applied to ALL responses.
            // CSP nonce is per-request and handled in middleware.ts.
            source: '/(.*)',
            headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-XSS-Protection', value: '1; mode=block' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                {
                    key: 'Permissions-Policy',
                    value: 'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
                },
                {
                    key: 'Strict-Transport-Security',
                    value: 'max-age=31536000; includeSubDomains; preload',
                },
                { key: 'X-DNS-Prefetch-Control', value: 'off' },
                { key: 'X-Download-Options', value: 'noopen' },
                { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
            ],
        },
        {
            // Cache control for sensitive pages (protected routes)
            source: '/(store|admin|agent|orders|wishlist|account|cart)(.*)',
            headers: [
                { key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate' },
                { key: 'Pragma', value: 'no-cache' },
                { key: 'Expires', value: '0' },
            ],
        },
        {
            // Security headers for API routes
            source: '/api/(.*)',
            headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
            ],
        },
    ],
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "pixelcraft",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
