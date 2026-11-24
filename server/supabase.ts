// Load .env before reading any variable (ES imports run before server.ts calls dotenv.config())
import 'dotenv/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';
import { isRedactedClerkKey, resolveClerkKeys } from './clerkKeys.ts';

export class SupabaseConfigurationError extends Error {
  readonly code = 'SUPABASE_NOT_CONFIGURED';
  readonly status = 503;

  constructor() {
    super('Supabase is not configured on this deployment.');
    this.name = 'SupabaseConfigurationError';
  }
}

let adminClient: SupabaseClient | undefined;
let clerkClient: ReturnType<typeof createClerkClient> | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim());
}

function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new SupabaseConfigurationError();
  if (!adminClient) {
    // Server-side client with full access. Never expose this key to the browser.
    adminClient = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SECRET_KEY!.trim(),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return adminClient;
}

// Keep the existing client export while deferring configuration checks until use.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export interface SessionUser {
  id: string;
  email: string | null;
  name: string;
  image: string | null;
  phoneNumber: string | null;
  role: string;
  preferredCity: string | null;
  provider: string;
  createdAt: string;
}

type TokenVerifier = typeof verifyToken;
type ProfileLoader = (clerkId: string, secretKey: string) => Promise<SessionUser>;

/**
 * Loads the Clerk account and the matching marketplace profile for a verified session.
 *
 * The Clerk identity is what makes the visitor signed in; the profile row only stores
 * marketplace preferences. A missing table, a stale PostgREST schema cache or a failed
 * insert must therefore not turn a verified session into a 401 — that is what made the
 * store form tell signed-in merchants to "sign in again".
 */
async function loadClerkProfile(clerkId: string, secretKey: string): Promise<SessionUser> {
  clerkClient ??= createClerkClient({ secretKey });
  const clerkUser = await clerkClient.users.getUser(clerkId);
  // The admin allow-list matches on this address, so fall back to the first address
  // when the primary id is missing rather than treating the account as emailless.
  const primaryEmail = clerkUser.emailAddresses.find((address) => address.id === clerkUser.primaryEmailAddressId);
  const email = primaryEmail?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null;
  const name = clerkUser.fullName || email?.split('@')[0] || 'Verified Customer';

  // What the session looks like when no profile row can be used.
  const identity: SessionUser = {
    id: clerkId,
    email,
    name,
    image: clerkUser.imageUrl,
    phoneNumber: clerkUser.phoneNumbers[0]?.phoneNumber ?? null,
    role: ((clerkUser as any)?.publicMetadata?.role ?? 'buyer'),
    preferredCity: null,
    provider: 'clerk',
    createdAt: new Date(clerkUser.createdAt).toISOString(),
  };

  let profile: any = null;
  try {
    const { data: existingProfile, error: readError } = await supabaseAdmin
      .from('clerk_profiles')
      .select('*')
      .eq('clerk_id', clerkId)
      .maybeSingle();
    if (readError) throw readError;
    profile = existingProfile;

    if (!profile) {
      const { data: createdProfile, error: insertError } = await supabaseAdmin
        .from('clerk_profiles')
        .insert({ clerk_id: clerkId, email, name, image: clerkUser.imageUrl })
        .select('*')
        .single();
      if (insertError) {
        // The profile fetch and the first store call fire together, so another request
        // may have inserted the row between this read and this insert.
        const { data: racedProfile } = await supabaseAdmin
          .from('clerk_profiles')
          .select('*')
          .eq('clerk_id', clerkId)
          .maybeSingle();
        if (racedProfile) {
          profile = racedProfile;
        } else {
          console.error('[auth] could not create clerk profile:', insertError.message);
        }
      } else {
        profile = createdProfile;
      }
    }
  } catch (error) {
    console.error(
      '[auth] clerk profile lookup failed; using the verified Clerk identity:',
      error instanceof Error ? error.message : error,
    );
  }

  if (!profile) return identity;

  return {
    ...identity,
    name: profile.name || name,
    image: profile.image || clerkUser.imageUrl,
    phoneNumber: profile.phone ?? identity.phoneNumber,
    role: profile.role || 'buyer',
    preferredCity: profile.preferred_city ?? null,
    createdAt: profile.created_at || identity.createdAt,
  };
}

/**
 * The origins whose sessions this server trusts. verifyToken compares the token's
 * `azp` claim against this list, and the live site canonicalises to the www host
 * while deployments configure the apex domain, so an apex entry also covers its www
 * sibling. Without that widening, every API call from the live www site looks like it
 * came from an untrusted party and is rejected.
 */
export function expandAuthorizedParties(raw?: string): string[] | undefined {
  const configured = (raw ?? '')
    .split(',')
    .map((party) => party.trim())
    .filter(Boolean);
  if (configured.length === 0) return undefined;

  const allowed = new Set<string>();
  for (const party of configured) {
    allowed.add(party);
    // Only bare https origins grow a www sibling: localhost, http and paths stay exact.
    const bareHost = /^https:\/\/([^/:?#]+)\/?$/i.exec(party);
    if (!bareHost || bareHost[1].toLowerCase().startsWith('www.')) continue;
    allowed.add(`https://www.${bareHost[1]}`);
  }
  return [...allowed];
}

/**
 * The origin this request was actually served from. Vercel forwards the public host in
 * `x-forwarded-host`, while a direct Express run only sends `host`.
 */
function requestOrigin(req: Request): string | null {
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const host = forwardedHost || (req.headers.host as string | undefined);
  if (!host) return null;
  const proto = ((req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] || '').trim()
    || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  if (proto !== 'http' && proto !== 'https') return null;
  return `${proto}://${host}`;
}

/**
 * The apex/www sibling of an origin. Clerk compares the token's `azp` claim to the
 * authorized parties with an exact string match, and the live site is reachable as both
 * spellings: a session minted on https://abumarketplace.shop is the same deployment as
 * one minted on https://www.abumarketplace.shop. Without the sibling, a merchant who
 * signed in through the apex host is answered 401 by every API call from the www host.
 */
function siblingOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.port) return null;
    const host = url.host.toLowerCase();
    const sibling = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
    return `${url.protocol}//${sibling}`;
  } catch {
    return null;
  }
}

/**
 * Authorized parties are the origins whose sessions this server accepts. Besides the
 * configured list, the host serving this request—and its apex/www sibling—is trusted: a
 * token minted on either spelling is exactly the session the browser is presenting.
 * This keeps apex, www and preview spellings of the deployment working without pinning
 * every one in config.
 */
function acceptedParties(req: Request): string[] | undefined {
  const parties = new Set(expandAuthorizedParties(process.env.CLERK_AUTHORIZED_PARTIES) || []);
  const origin = requestOrigin(req);
  if (origin) {
    parties.add(origin);
    const sibling = siblingOrigin(origin);
    if (sibling) parties.add(sibling);
  }
  return parties.size > 0 ? [...parties] : undefined;
}

/**
 * Which Clerk key family this server can verify with, without revealing key material.
 * A missing secret, or a test-instance secret behind a live publishable key, is the
 * difference between "the merchant's session is bad" and "this deployment cannot check
 * any session" — which is otherwise invisible from the browser.
 */
export function clerkKeyMode(): 'live' | 'test' | 'missing' | 'invalid' {
  const secretKey = resolveClerkKeys(process.env).secretKey;
  if (!secretKey) return 'missing';
  // A redacted placeholder starts with `sk_live_`, so the prefix alone cannot be trusted.
  if (isRedactedClerkKey(secretKey)) return 'invalid';
  return secretKey.startsWith('sk_live_') ? 'live' : 'test';
}

/**
 * Why the session check for this request failed, kept per request so a route can answer
 * with a short, non-secret code. Without it a merchant's 401 is indistinguishable from a
 * missing token, a stale secret, or an origin mismatch without reading server logs.
 */
const rejections = new WeakMap<Request, string>();

/** The reason `getSessionUser` rejected this request, or null when it accepted it. */
export function authRejectionReason(req: Request): string | null {
  return rejections.get(req) ?? null;
}

/** Every reason `getSessionUser` can record, so callers and tests can enumerate them. */
export const AUTH_REJECTION_CODES = [
  'missing-token',
  'secret-missing',
  'missing-subject',
  'token-expired',
  'azp-mismatch',
  'signature-mismatch',
  'malformed-token',
  'invalid-token',
] as const;

export type AuthRejectionCode = (typeof AUTH_REJECTION_CODES)[number];

/**
 * Adds the session-rejection code to a 401 body. The code names why the token was
 * refused (no token, wrong Clerk instance, expired) without revealing key material, so
 * the merchant and the admin Diagnostics panel can tell "signed out" from "this
 * deployment cannot verify any session" instead of guessing from a generic 401.
 * An accepted request leaves the body untouched, so 200s never gain a `code`.
 */
export function withAuthCode(req: Request, body: Record<string, unknown>): Record<string, unknown> {
  const code = authRejectionReason(req);
  return code ? { ...body, code } : body;
}

/** Maps a Clerk verification error onto a short code that reveals no key material. */
export function rejectionCode(error: unknown): string {
  const reason = (error as { reason?: unknown } | null)?.reason;
  const text = `${typeof reason === 'string' ? reason : ''} ${error instanceof Error ? error.message : ''}`.toLowerCase();
  if (text.includes('expired')) return 'token-expired';
  if (text.includes('azp') || text.includes('authorized part')) return 'azp-mismatch';
  if (text.includes('signature')) return 'signature-mismatch';
  if (text.includes('subject') || text.includes('sub claim')) return 'missing-subject';
  if (text.includes('malformed') || text.includes('jwt')) return 'malformed-token';
  return 'invalid-token';
}

/**
 * Verifies a Clerk bearer token and loads the user's marketplace profile.
 * The optional seams exist so tests can drive the payload handling without Clerk
 * or Supabase; production callers always use the real implementations.
 */
export async function getSessionUser(
  req: Request,
  seams: { verify?: TokenVerifier; loadProfile?: ProfileLoader } = {},
): Promise<SessionUser | null> {
  rejections.delete(req);
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    rejections.set(req, 'missing-token');
    return null;
  }
  const token = header.slice(7).trim();
  if (!token) {
    rejections.set(req, 'missing-token');
    return null;
  }
  // Must match the instance the browser signed in against, or every token is rejected.
  const secretKey = resolveClerkKeys(process.env).secretKey;
  if (!secretKey || isRedactedClerkKey(secretKey)) {
    // A placeholder such as `sk_live_…` fails every verification, so say so once, loudly,
    // instead of reporting each merchant's perfectly good token as invalid.
    console.error(
      secretKey
        ? '[auth] CLERK_SECRET_KEY is a redacted placeholder (e.g. "sk_live_…"), so no session can be verified. Paste the real secret from the Clerk dashboard.'
        : '[auth] CLERK_SECRET_KEY is not set, so signed-in requests cannot be verified.',
    );
    rejections.set(req, 'secret-missing');
    return null;
  }

  try {
    const verify = seams.verify ?? verifyToken;
    const verified = await verify(token, {
      secretKey,
      authorizedParties: acceptedParties(req),
    });
    // verifyToken resolves to the decoded session payload itself (it unwraps the
    // { data } envelope), so the Clerk user id lives on `sub` directly.
    const clerkId = (verified as { sub?: string } | null)?.sub;
    if (!clerkId) {
      rejections.set(req, 'missing-subject');
      return null;
    }

    const loadProfile = seams.loadProfile ?? loadClerkProfile;
    return await loadProfile(clerkId, secretKey);
  } catch (error) {
    rejections.set(req, rejectionCode(error));
    console.warn('[auth] Clerk token verification failed:', error);
    return null;
  }
}
