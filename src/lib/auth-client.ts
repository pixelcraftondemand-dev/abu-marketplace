import { createAuthClient } from 'better-auth/react';
import { phoneNumberClient } from 'better-auth/client/plugins';
import { UserProfile } from '../types';

// Initialize Better Auth React Client
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  plugins: [phoneNumberClient()],
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
 * Format Better Auth User to app UserProfile
 */
export function formatBetterAuthUser(user: any, provider: 'whatsapp' | 'sms' | 'google' | 'apple' | 'email' | 'phone' = 'phone'): UserProfile {
  const cleanPhone = user.phoneNumber || '';
  return {
    id: user.id || `usr_${Date.now()}`,
    name: user.name || (user.email ? user.email.split('@')[0] : 'Verified Customer'),
    whatsappNumber: cleanPhone || undefined,
    phoneNumber: cleanPhone || undefined,
    email: user.email?.includes('@phone.abumarketplace.sl') ? undefined : user.email,
    provider: provider === 'sms' ? 'phone' : provider,
    isVerified: true,
    avatar: user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || cleanPhone || 'User')}&backgroundColor=0B3B60,002541&textColor=ffffff`,
    role: user.role || 'buyer',
    preferredCity: user.preferredCity || 'Freetown (Central / CBD)',
    joinedAt: user.createdAt 
      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };
}

/**
 * 1. Send One-Time Password via WhatsApp or SMS using Better Auth
 */
export async function sendBetterAuthPhoneOtp(phoneNumber: string, channel: 'whatsapp' | 'sms' = 'whatsapp'): Promise<{ success: boolean; message: string; otpCode?: string }> {
  try {
    const res = await fetch('/api/custom-auth/phone/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, channel }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to dispatch verification code');
    }

    return {
      success: true,
      message: data.message,
      otpCode: data.code,
    };
  } catch (err: any) {
    console.error('Error sending phone OTP via Better Auth:', err);
    throw new Error(err.message || 'Error communicating with Better Auth service');
  }
}

/**
 * 2. Verify 6-digit OTP and establish authentic session in SQLite
 */
export async function verifyBetterAuthPhoneOtp(params: {
  phoneNumber: string;
  code: string;
  fullName?: string;
  preferredCity?: string;
  channel?: 'whatsapp' | 'sms';
}): Promise<{ user: UserProfile; token: string }> {
  try {
    const res = await fetch('/api/custom-auth/phone/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Verification failed. Please double-check your code.');
    }

    if (data.token) {
      localStorage.setItem('better_auth_token', data.token);
    }

    const provider = params.channel === 'whatsapp' ? 'whatsapp' : 'phone';
    const profile = formatBetterAuthUser(data.user, provider);
    localStorage.setItem('abu_marketplace_user', JSON.stringify(profile));

    return { user: profile, token: data.token };
  } catch (err: any) {
    console.error('Error verifying phone OTP via Better Auth:', err);
    throw new Error(err.message || 'Code verification failed');
  }
}

/**
 * 3. Sign In with Email & Password via Better Auth
 */
export async function signInWithBetterAuthEmail(email: string, password: string): Promise<UserProfile> {
  try {
    const res = await authClient.signIn.email({
      email: email.trim(),
      password,
    });

    if (res.error) {
      throw new Error(res.error.message || 'Invalid email or password');
    }

    const user = res.data?.user;
    if (!user) throw new Error('Failed to retrieve user profile');

    const profile = formatBetterAuthUser(user, 'email');
    localStorage.setItem('abu_marketplace_user', JSON.stringify(profile));
    if (res.data?.token) {
      localStorage.setItem('better_auth_token', res.data.token);
    }
    return profile;
  } catch (err: any) {
    console.error('Better Auth Email sign-in error:', err);
    throw new Error(err.message || 'Email authentication failed');
  }
}

/**
 * 4. Sign Up with Email, Password & Sierra Leone profile fields
 */
export async function signUpWithBetterAuthEmail(params: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  preferredCity?: string;
}): Promise<UserProfile> {
  try {
    const res = await (authClient.signUp.email as any)({
      name: params.name.trim(),
      email: params.email.trim(),
      password: params.password,
      phoneNumber: params.phoneNumber?.trim() || undefined,
      preferredCity: params.preferredCity || 'Freetown (Central / CBD)',
      role: 'buyer',
    });

    if (res.error) {
      throw new Error(res.error.message || 'Registration failed');
    }

    const user = res.data?.user;
    if (!user) throw new Error('Account created but user data missing');

    const profile = formatBetterAuthUser(user, 'email');
    localStorage.setItem('abu_marketplace_user', JSON.stringify(profile));
    if (res.data?.token) {
      localStorage.setItem('better_auth_token', res.data.token);
    }
    return profile;
  } catch (err: any) {
    console.error('Better Auth Email sign-up error:', err);
    throw new Error(err.message || 'Registration failed');
  }
}

/**
 * 5. Quick Social Sign-In (Google / Apple) backed by Better Auth
 */
export async function quickSocialLogin(
  provider: 'google' | 'apple', 
  fullName?: string, 
  email?: string,
  preferredCity?: string
): Promise<UserProfile> {
  try {
    const res = await fetch('/api/custom-auth/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, fullName, email, preferredCity }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Social sign-in failed');
    }

    if (data.token) {
      localStorage.setItem('better_auth_token', data.token);
    }

    const profile = formatBetterAuthUser(data.user, provider);
    localStorage.setItem('abu_marketplace_user', JSON.stringify(profile));
    return profile;
  } catch (err: any) {
    console.error('Better Auth Social sign-in error:', err);
    throw new Error(err.message || 'Social sign-in failed');
  }
}

/**
 * 6. Fetch Active Session from Better Auth server
 */
export async function getActiveBetterAuthSession(): Promise<UserProfile | null> {
  try {
    const token = localStorage.getItem('better_auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/custom-auth/me', { headers });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.success || !data.user) return null;

    const profile = formatBetterAuthUser(data.user, data.user.provider || 'phone');
    localStorage.setItem('abu_marketplace_user', JSON.stringify(profile));
    return profile;
  } catch (err) {
    console.warn('Could not restore Better Auth session:', err);
    return null;
  }
}

/**
 * 7. Sign Out from Better Auth
 */
export async function signOutBetterAuth(): Promise<void> {
  try {
    const token = localStorage.getItem('better_auth_token');
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (err) {
    console.warn('Sign-out request warning:', err);
  } finally {
    localStorage.removeItem('better_auth_token');
    localStorage.removeItem('abu_marketplace_user');
  }
}

/**
 * 8. Update User Profile in Better Auth database
 */
export async function updateBetterAuthProfile(updates: {
  name?: string;
  role?: 'buyer' | 'merchant' | 'artisan';
  preferredCity?: string;
}): Promise<UserProfile | null> {
  try {
    const token = localStorage.getItem('better_auth_token');
    const res = await fetch('/api/custom-auth/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update profile');
    }

    const profile = formatBetterAuthUser(data.user);
    localStorage.setItem('abu_marketplace_user', JSON.stringify(profile));
    return profile;
  } catch (err: any) {
    console.error('Update profile error:', err);
    throw new Error(err.message || 'Profile update failed');
  }
}
