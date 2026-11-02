import { supabase } from './supabase';
import { UserProfile } from '../types';

// Kept so any old import of `authClient` still resolves
export const authClient = supabase;

const TOKEN_KEY = 'better_auth_token'; // name kept so other code reading it keeps working
const USER_KEY = 'abu_marketplace_user';

// Keep the stored access token in sync as Supabase refreshes it
supabase.auth.onAuthStateChange((_event, session) => {
  try {
    if (session?.access_token) localStorage.setItem(TOKEN_KEY, session.access_token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
});

export interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  image?: string;
  role?: 'buyer' | 'merchant' | 'artisan';
  preferredCity?: string;
  createdAt?: string;
}

/**
 * Format a flat user object to the app UserProfile
 */
export function formatBetterAuthUser(user: any, provider: 'whatsapp' | 'sms' | 'google' | 'facebook' | 'apple' | 'email' | 'phone' = 'phone'): UserProfile {
  const cleanPhone = user.phoneNumber || '';
  const finalProvider = user.provider || (provider === 'sms' ? 'phone' : provider);
  return {
    id: user.id || `usr_${Date.now()}`,
    name: user.name || (user.email ? user.email.split('@')[0] : 'Verified Customer'),
    whatsappNumber: cleanPhone || undefined,
    phoneNumber: cleanPhone || undefined,
    email: (user.email?.includes('@phone.abumarketplace.sl') || user.email?.includes('@phone.abumarketplace.shop')) ? undefined : user.email,
    provider: finalProvider,
    isVerified: true,
    avatar: user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || cleanPhone || 'User')}&backgroundColor=0B3B60,002541&textColor=ffffff`,
    role: user.role || 'buyer',
    preferredCity: user.preferredCity || 'Freetown (Central / CBD)',
    joinedAt: user.createdAt
      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  } as UserProfile;
}

// Merge a Supabase auth user with their profiles row into one flat object
function flattenUser(u: any, profile: any) {
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

async function buildProfile(
  sbUser: any,
  provider: 'whatsapp' | 'sms' | 'google' | 'facebook' | 'apple' | 'email' | 'phone' = 'email'
): Promise<UserProfile> {
  const { data: row } = await supabase.from('profiles').select('*').eq('id', sbUser.id).maybeSingle();
  const profile = formatBetterAuthUser(flattenUser(sbUser, row), provider);
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
  } catch {
    /* storage unavailable */
  }
  return profile;
}

/**
 * 1. Phone OTP (not enabled yet, needs an SMS provider configured in Supabase)
 */
export async function sendBetterAuthPhoneOtp(_phoneNumber: string, _channel: 'whatsapp' | 'sms' = 'whatsapp'): Promise<{ success: boolean; message: string; otpCode?: string }> {
  throw new Error('Phone sign-in is not available yet. Please use your email instead.');
}

/**
 * 2. Verify phone OTP (not enabled yet)
 */
export async function verifyBetterAuthPhoneOtp(_params: {
  phoneNumber: string;
  code: string;
  fullName?: string;
  preferredCity?: string;
  channel?: 'whatsapp' | 'sms';
}): Promise<{ user: UserProfile; token: string }> {
  throw new Error('Phone sign-in is not available yet. Please use your email instead.');
}

/**
 * 3. Sign in with email and password
 */
export async function signInWithBetterAuthEmail(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message || 'Invalid email or password');
  if (!data.user) throw new Error('Failed to retrieve user profile');
  return buildProfile(data.user, 'email');
}

/**
 * 4. Sign up with email, password and Sierra Leone profile fields
 */
/**
 * Sign-up either establishes a session immediately, or asks the user to confirm
 * their email first. That second case is a normal outcome, not an error, so it
 * is returned as a state the UI can render.
 */
export type SignUpResult =
  | { status: 'signed_in'; user: UserProfile }
  | { status: 'confirmation_required'; email: string };

export async function signUpWithBetterAuthEmail(params: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  preferredCity?: string;
}): Promise<SignUpResult> {
  const email = params.email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        name: params.name.trim(),
        preferred_city: params.preferredCity || 'Freetown (Central / CBD)',
      },
    },
  });
  if (error) throw new Error(error.message || 'Registration failed');
  if (!data.user) throw new Error('Account created but user data missing');
  if (!data.session) {
    // Email confirmation is enabled in Supabase: the account exists but the
    // user must click the link (or enter the code) before they can sign in.
    return { status: 'confirmation_required', email };
  }
  return { status: 'signed_in', user: await buildProfile(data.user, 'email') };
}

/**
 * Social sign-in links are handled by Supabase now
 */
export async function getOAuthUrl(_provider: 'google' | 'facebook' | 'apple'): Promise<{ configured: boolean; url: string | null }> {
  return { configured: false, url: null };
}

/**
 * 4b. Send a one-time code to the user's email inbox
 */
export async function sendEmailOtp(
  email: string,
  _provider: 'google' | 'facebook' | 'apple' | 'email' = 'google'
): Promise<{ success: boolean; message: string; previewUrl?: string | null; code?: string }> {
  const clean = email.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(error.message || 'Failed to dispatch verification code');
  return { success: true, message: `A verification code has been sent to ${clean}.` };
}

/**
 * 4c. Verify the emailed code and establish a session
 */
export async function verifyEmailOtp(
  email: string,
  code: string,
  provider: 'google' | 'facebook' | 'apple' | 'email' = 'google'
): Promise<UserProfile> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw new Error(error.message || 'Verification failed. Please check your code.');
  if (!data.user) throw new Error('Verification failed');
  return buildProfile(data.user, provider);
}

// 4d. (Google One-Tap / Identity Services removed — Google sign-in goes through
// Supabase OAuth redirect in quickSocialLogin below.)

/**
 * 5. Social sign-in. With email and password it signs in normally; Google uses a redirect.
 */
export async function quickSocialLogin(
  provider: 'google' | 'facebook' | 'apple',
  _fullName?: string,
  email?: string,
  password?: string,
  _preferredCity?: string
): Promise<UserProfile> {
  if (email && password) {
    return signInWithBetterAuthEmail(email, password);
  }
  if (provider === 'google') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message || 'Google Sign-In failed');
    // The browser is redirected to Google; this promise intentionally never resolves
    return new Promise<UserProfile>(() => {});
  }
  const name = provider.charAt(0).toUpperCase() + provider.slice(1);
  throw new Error(`${name} sign-in is not available yet. Please use email or Google.`);
}

/**
 * 6. Restore the active session (also completes a Google redirect)
 */
export async function getActiveBetterAuthSession(): Promise<UserProfile | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const sbUser = data.session?.user;
    if (!sbUser) return null;
    return await buildProfile(sbUser);
  } catch (err) {
    console.warn('Could not restore session:', err);
    return null;
  }
}

/**
 * 7. Sign out
 */
export async function signOutBetterAuth(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Sign-out request warning:', err);
  } finally {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
  }
}

/**
 * 8. Update the user's profile (the server checks the token and allowed roles)
 */
export async function updateBetterAuthProfile(updates: {
  name?: string;
  role?: 'buyer' | 'merchant' | 'artisan';
  preferredCity?: string;
}): Promise<UserProfile | null> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error('You are not signed in');

  const res = await fetch('/api/custom-auth/update-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update profile');

  const profile = formatBetterAuthUser(data.user);
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
  } catch {
    /* storage unavailable */
  }
  return profile;
}
