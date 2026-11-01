// Load .env before reading any variable (ES imports run before server.ts calls dotenv.config())
import 'dotenv/config';
import fs from 'node:fs';
import tls from 'node:tls';
import pg from 'pg';
import { betterAuth } from 'better-auth';
import { bearer, phoneNumber } from 'better-auth/plugins';
import { Request } from 'express';
import { generateAlphanumericOtp } from './otp.ts';
import { dash, createSMSSender } from '@better-auth/infra';

// Supabase signs its database certificates with a private root CA that is not in
// Node's trust store, so it is bundled to keep full certificate verification on.
const SUPABASE_ROOT_CA = new URL('../certs/supabase-root-2021-ca.pem', import.meta.url);

function trustedCAs(): string[] {
  const override = process.env.DATABASE_SSL_CA;
  const custom = override
    ? override.includes('BEGIN CERTIFICATE')
      ? override
      : fs.readFileSync(override, 'utf8')
    : fs.readFileSync(SUPABASE_ROOT_CA, 'utf8');
  // Keep the public roots so non-Supabase databases still verify normally.
  return [custom, ...tls.rootCertificates];
}

// pg reads sslmode out of the URL itself and that would override the ssl config
// below, so it is removed and handled here instead.
function withoutSslMode(connectionString: string): string {
  const [base, ...query] = connectionString.split('?');
  if (query.length === 0) return connectionString;
  const rest = query
    .join('?')
    .split('&')
    .filter((param) => !/^sslmode=/i.test(param));
  return rest.length > 0 ? `${base}?${rest.join('&')}` : base;
}

/**
 * Builds the Postgres pool config. TLS certificates are always verified (chain
 * and hostname) unless explicitly opted out of — see DATABASE_SSL_NO_VERIFY.
 */
function postgresConfig(): pg.PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[db] DATABASE_URL is not set; the Postgres pool cannot connect.');
    return { max: 5 };
  }

  let sslMode = process.env.DATABASE_SSL_MODE?.toLowerCase();
  try {
    const parsed = new URL(connectionString);
    sslMode = parsed.searchParams.get('sslmode')?.toLowerCase() || sslMode;
  } catch {
    console.error('[db] DATABASE_URL is not a valid URL; TLS verification uses defaults.');
  }

  const cleaned = withoutSslMode(connectionString);

  if (sslMode === 'disable') {
    console.warn('[db] WARNING: TLS is disabled for the Postgres connection (sslmode=disable).');
    return { connectionString: cleaned, max: 5 };
  }

  if (sslMode === 'no-verify' || process.env.DATABASE_SSL_NO_VERIFY === 'true') {
    console.warn(
      '[db] WARNING: Postgres TLS certificate verification is DISABLED. ' +
        'Traffic is encrypted but the server identity is not checked, so this is open to ' +
        'man-in-the-middle attacks. Remove DATABASE_SSL_NO_VERIFY to restore verification.',
    );
    return { connectionString: cleaned, ssl: { rejectUnauthorized: false }, max: 5 };
  }

  return {
    connectionString: cleaned,
    ssl: { rejectUnauthorized: true, ca: trustedCAs() },
    max: 5,
  };
}

// Postgres (Supabase) connection
export const pool = new pg.Pool(postgresConfig());

// Columns that Postgres needs in double quotes because they are camelCase
const QUOTE = [
  'phoneNumberVerified', 'phoneNumber', 'emailVerified', 'preferredCity',
  'createdAt', 'updatedAt', 'expiresAt', 'ipAddress', 'userAgent', 'userId',
  'accountId', 'providerId', 'accessTokenExpiresAt', 'refreshTokenExpiresAt',
  'accessToken', 'refreshToken', 'idToken',
];
const quoteRe = new RegExp(`(?<!")\\b(${QUOTE.join('|')})\\b(?!")`, 'g');

// Converts an old SQLite-style query into a Postgres one
function toPg(sql: string, params: any[]) {
  let i = 0;
  const text = sql
    .replace(quoteRe, '"$1"')
    .replace(/\b(FROM|UPDATE|INTO|TABLE)\s+user\b/gi, '$1 "user"')
    .replace(/\?/g, () => `$${++i}`);
  // Date.now() numbers become real timestamps
  const values = params.map((p) =>
    typeof p === 'number' && p > 1e12 ? new Date(p) : p
  );
  return { text, values };
}

export const db = {
  async get(sql: string, params: any[] = []) {
    const { text, values } = toPg(sql, params);
    return (await pool.query(text, values)).rows[0];
  },
  async all(sql: string, params: any[] = []) {
    const { text, values } = toPg(sql, params);
    return (await pool.query(text, values)).rows;
  },
  async run(sql: string, params: any[] = []) {
    const { text, values } = toPg(sql, params);
    return pool.query(text, values);
  },
};

// In-memory record of latest dispatched OTPs for carrier gateway confirmation & notification
export const dispatchedOtps = new Map<string, { code: string; sentAt: number; channel: string }>();

export function getDispatchedOtp(phoneNumber: string): string | undefined {
  const clean = phoneNumber.replace(/[^0-9]/g, '');
  for (const [key, val] of dispatchedOtps.entries()) {
    if (key.replace(/[^0-9]/g, '') === clean) {
      // Valid for 10 minutes
      if (Date.now() - val.sentAt < 10 * 60 * 1000) {
        return val.code;
      }
    }
  }
  return undefined;
}

export const BETTER_AUTH_API_KEY = process.env.BETTER_AUTH_API_KEY || 'ba_cn6v0fyinlj38h4q6t49ksdjmq8g9tqf';
export const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'abu-marketplace-secure-auth-secret-sl-2026-prod-token';
export const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'https://abumarketplace.shop';

const smsSender = createSMSSender({ apiKey: BETTER_AUTH_API_KEY });

export const auth = betterAuth({
  database: pool,
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: [
    'https://abumarketplace.shop',
    'https://www.abumarketplace.shop',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    process.env.APP_URL || '',
    BETTER_AUTH_URL,
    'https://ais-dev-mwjnsmpsez6dbl5ruxi3bu-664654490955.europe-west2.run.app',
    'https://ais-pre-mwjnsmpsez6dbl5ruxi3bu-664654490955.europe-west2.run.app',
  ].filter(Boolean),
  advanced: {
    useSecureCookies: false, // Allows session tokens to persist across localhost, preview iframes, and HTTPS production
  },
  plugins: [
    bearer(),
    dash({ apiKey: BETTER_AUTH_API_KEY }),
    (phoneNumber as any)({
      otpLength: 6,
      expiresIn: 300, // 5 minutes single-use expiration
      generateOTP: () => generateAlphanumericOtp(6),
      signUpOnVerification: {
        getTempEmail: (phone: string) => `${phone.replace(/[^0-9]/g, '')}@phone.abumarketplace.shop`,
        getTempName: (phone: string) => `Verified Shopper (+${phone.slice(-4)})`,
      },
      sendOTP: async ({ phoneNumber: phone, code }: { phoneNumber: string; code: string }) => {
        console.log(`[Better Auth OTP Service] Dispatched 6-digit verification code ${code} to ${phone}`);
        dispatchedOtps.set(phone, {
          code,
          sentAt: Date.now(),
          channel: 'sms/whatsapp',
        });

        // Dispatch via Better Auth Managed SMS Infrastructure
        try {
          const smsRes = await smsSender.send({ to: phone, code });
          if (!smsRes?.success) {
            console.info(`[Better Auth Infrastructure SMS] Notice: ${smsRes?.error || 'Local delivery active'}`);
          } else {
            console.log(`[Better Auth Infrastructure SMS] Sent successfully, ID: ${smsRes.messageId}`);
          }
        } catch (smsErr) {
          console.info('[Better Auth Infrastructure SMS Dispatch notice]:', smsErr);
        }
      },
    }),
  ],
  user: {
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: 'buyer' },
      preferredCity: { type: 'string', required: false },
      provider: { type: 'string', required: false, defaultValue: 'google' },
      cart: { type: 'string', required: false, defaultValue: '[]' },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
});

/**
 * Extracts authenticated Better Auth session from incoming Express request
 */
export async function getBetterAuthSession(req: Request) {
  try {
    const authHeader = req.headers.authorization;
    const cookieHeader = req.headers.cookie;

    const headers = new Headers();
    if (authHeader) headers.set('authorization', authHeader);
    if (cookieHeader) headers.set('cookie', cookieHeader);

    // Call Better Auth getSession
    const session = await auth.api.getSession({ headers });
    return session;
  } catch (err) {
    console.error('Error fetching Better Auth session:', err);
    return null;
  }
}