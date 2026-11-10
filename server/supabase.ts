// Load .env before reading any variable (ES imports run before server.ts calls dotenv.config())
import 'dotenv/config';
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

export function flattenUser(u: any, profile: any): SessionUser {
  return {
    id: u.id,
    email: u.email ?? null,
    name:
      profile?.name ||
      u.user_metadata?.name ||
      u.user_metadata?.full_name ||
      (u.email ? u.email.split('@')[0] : 'Verified Customer'),
    image: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
    phoneNumber: profile?.phone || u.phone || null,
    role: profile?.role || 'buyer',
    preferredCity: profile?.preferred_city || null,
    provider: profile?.provider || u.app_metadata?.provider || 'email',
    createdAt: u.created_at,
  };
}

/**
 * Verifies the Bearer token on a request with Supabase and returns the user
 * merged with their profile row, or null if the token is missing or invalid.
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  return flattenUser(data.user, profile);
}
