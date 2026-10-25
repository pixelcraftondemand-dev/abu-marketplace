import { UserProfile } from '../types';

export const CLERK_PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || '';

export const isClerkKeyValid = (key?: string): boolean => {
  const k = key || CLERK_PUBLISHABLE_KEY;
  return typeof k === 'string' && (k.startsWith('pk_test_') || k.startsWith('pk_live_')) && k.length > 20;
};

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  percentage: number;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Excellent';
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumberOrSymbol: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumberOrSymbol: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const percentage = (score / 4) * 100;

  let label: PasswordStrengthResult['label'] = 'Very Weak';
  let color = 'bg-red-500';

  if (score === 1) {
    label = 'Weak';
    color = 'bg-red-500';
  } else if (score === 2) {
    label = 'Fair';
    color = 'bg-amber-500';
  } else if (score === 3) {
    label = 'Strong';
    color = 'bg-blue-500';
  } else if (score === 4) {
    label = 'Excellent';
    color = 'bg-emerald-500';
  }

  return {
    score,
    percentage,
    label,
    color,
    checks,
  };
}

export function createClerkUserProfile(params: {
  id?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  role?: 'buyer' | 'merchant' | 'artisan';
  preferredCity?: string;
  provider?: 'clerk' | 'whatsapp' | 'google' | 'facebook' | 'apple' | 'email' | 'phone';
}): UserProfile {
  const id = params.id || `usr_clerk_${Date.now()}`;
  const name = params.name.trim() || (params.email ? params.email.split('@')[0] : 'Verified Member');
  const role = params.role || 'buyer';
  const preferredCity = params.preferredCity || 'Freetown (Central / CBD)';
  const provider = params.provider || 'clerk';
  
  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0B3B60,00875A&textColor=ffffff`;

  return {
    id,
    name,
    email: params.email?.trim() || undefined,
    phoneNumber: params.phoneNumber?.trim() || undefined,
    whatsappNumber: params.phoneNumber?.trim() || undefined,
    provider,
    isVerified: true,
    avatar,
    preferredCity,
    role,
    joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };
}
