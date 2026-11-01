import pg from 'pg';
import { betterAuth } from 'better-auth';
import { bearer, phoneNumber } from 'better-auth/plugins';
import { Request } from 'express';
import { generateAlphanumericOtp } from './otp.ts';
import { dash, createSMSSender } from '@better-auth/infra';

// Postgres (Supabase) connection
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

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