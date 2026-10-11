import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { betterAuth } from 'better-auth';
import { bearer, phoneNumber } from 'better-auth/plugins';
import { Request } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path in prisma/dev.db
const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
export const db = new DatabaseSync(dbPath);

// Ensure Better Auth tables exist with required columns
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    phoneNumber TEXT UNIQUE,
    phoneNumberVerified INTEGER DEFAULT 0,
    role TEXT DEFAULT 'buyer',
    preferredCity TEXT,
    cart TEXT DEFAULT '[]',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expiresAt INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt INTEGER,
    refreshTokenExpiresAt INTEGER,
    scope TEXT,
    password TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
`);

// Add any missing columns to existing user table safely
try { db.exec('ALTER TABLE user ADD COLUMN phoneNumber TEXT UNIQUE'); } catch {}
try { db.exec('ALTER TABLE user ADD COLUMN phoneNumberVerified INTEGER DEFAULT 0'); } catch {}
try { db.exec("ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'buyer'"); } catch {}
try { db.exec('ALTER TABLE user ADD COLUMN preferredCity TEXT'); } catch {}
try { db.exec("ALTER TABLE user ADD COLUMN cart TEXT DEFAULT '[]'"); } catch {}

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

import { dash, createSMSSender } from '@better-auth/infra';

export const BETTER_AUTH_API_KEY = process.env.BETTER_AUTH_API_KEY || 'ba_cn6v0fyinlj38h4q6t49ksdjmq8g9tqf';
export const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'abu-marketplace-secure-auth-secret-sl-2026-prod-token';
export const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'https://abumarketplace.shop';

const smsSender = createSMSSender({ apiKey: BETTER_AUTH_API_KEY });

export const auth = betterAuth({
  database: db,
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
  ].filter(Boolean),
  plugins: [
    bearer(),
    dash({ apiKey: BETTER_AUTH_API_KEY }),
    phoneNumber({
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/[^0-9]/g, '')}@phone.abumarketplace.sl`,
        getTempName: (phone) => `Verified Shopper (+${phone.slice(-4)})`,
      },
      sendOTP: async ({ phoneNumber: phone, code }) => {
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
