// Load .env before reading any variable (ES imports run before server.ts calls dotenv.config())
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env');
}

// Server-side client with full access. Never expose this key to the browser.
export const supabaseAdmin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
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

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  return flattenUser(data.user, profile);
}
