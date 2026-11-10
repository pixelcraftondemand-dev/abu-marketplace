// Load .env before reading any variable (ES imports run before server.ts calls dotenv.config())
import 'dotenv/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

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

/**
 * Verifies a Clerk bearer token and loads the user's marketplace profile.
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) return null;

  try {
    const verified = await verifyToken(token, {
      secretKey,
      authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(',').map((party) => party.trim()).filter(Boolean),
    });
    const clerkId = (verified.data as { sub?: string } | undefined)?.sub;
    if (!clerkId) return null;

    clerkClient ??= createClerkClient({ secretKey });
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email = clerkUser.emailAddresses.find((address) => address.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? null;
    const name = clerkUser.fullName || email?.split('@')[0] || 'Verified Customer';
    const { data: existingProfile } = await supabaseAdmin
      .from('clerk_profiles')
      .select('*')
      .eq('clerk_id', clerkId)
      .maybeSingle();
    let profile = existingProfile;
    if (!profile) {
      const { data: createdProfile, error } = await supabaseAdmin
        .from('clerk_profiles')
        .insert({ clerk_id: clerkId, email, name, image: clerkUser.imageUrl })
        .select('*')
        .single();
      if (error) throw error;
      profile = createdProfile;
    }

    return {
      id: clerkId,
      email,
      name: profile.name || name,
      image: profile.image || clerkUser.imageUrl,
      phoneNumber: profile.phone ?? clerkUser.phoneNumbers[0]?.phoneNumber ?? null,
      role: profile.role || 'buyer',
      preferredCity: profile.preferred_city ?? null,
      provider: 'clerk',
      createdAt: profile.created_at,
    };
  } catch (error) {
    console.warn('[auth] Clerk token verification failed:', error);
    return null;
  }
}
