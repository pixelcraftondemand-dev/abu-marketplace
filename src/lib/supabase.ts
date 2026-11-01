import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const url: string | undefined = env.VITE_SUPABASE_URL;
const key: string | undefined = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
}

// Browser client. Only the publishable key belongs here, never the secret key.
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
