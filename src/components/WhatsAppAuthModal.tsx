import React, { useEffect, useState } from 'react';
import { ClerkLoaded, ClerkLoading, SignIn, SignUp } from '@clerk/react';
import { LogOut, ShieldCheck, X } from 'lucide-react';
import type { UserProfile } from '../types';
import { AbuLogo } from './AbuLogo';
import { EcommerceDoodles } from './EcommerceDoodles';
import { HappyShopperCart } from './HappyShopperCart';

const clerkAppearance = {
  variables: {
    colorPrimary: '#00875A',
    colorText: '#122033',
    colorTextSecondary: '#526171',
    colorBackground: '#ffffff',
    colorInputBackground: '#f8fafc',
    colorInputText: '#122033',
    borderRadius: '0.75rem',
  },
  layout: {
    // Always show the current ABU brand mark instead of the logo configured in Clerk.
    logoImageUrl: '/abu-logo.svg',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    logoBox: 'mx-auto mb-1 flex items-center justify-center',
    logoImage: 'h-12 w-12',
    card: 'w-full rounded-xl border border-slate-200 bg-white p-4 shadow-none',
    headerTitle: 'text-xl font-black text-slate-900',
    headerSubtitle: 'text-sm text-slate-600',
    socialButtonsBlock: 'hidden',
    socialButtonsBlockButton: 'hidden',
    formFieldLabel: 'text-xs font-bold text-slate-800',
    formFieldInput: 'h-10 border-slate-300 text-sm focus:border-emerald-700 focus:ring-emerald-700',
    formButtonPrimary: 'h-10 bg-emerald-700 text-sm font-bold shadow-sm hover:bg-emerald-800',
    footer: 'bg-transparent shadow-none',
    footerActionLink: 'font-bold text-emerald-800 hover:text-emerald-900',
    dividerLine: 'bg-slate-200',
    dividerText: 'text-xs text-slate-500',
  },
};

/** Shown while Clerk boots, so an empty half-rendered auth card never flashes up. */
const AuthFormSkeleton: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-[#144b77] dark:bg-[#04263F]"
  >
    <span
      aria-hidden="true"
      className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700/25 border-t-emerald-700 dark:border-[#8df7c1]/25 dark:border-t-[#8df7c1]"
    />
    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Loading secure sign-in…</p>
    <div className="mt-2 w-full space-y-2" aria-hidden="true">
      <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-white/10" />
      <div className="h-9 w-3/4 animate-pulse rounded-lg bg-slate-100 dark:bg-white/10" />
    </div>
  </div>
);

export interface WhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  initialTab?: string;
  initialEmailMode?: string;
}

export const WhatsAppAuthModal: React.FC<WhatsAppAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onOpenTerms,
  onOpenPrivacy,
  initialEmailMode,
}) => {
  // Sign-in / sign-up switch, seeded from the route that opened the modal.
  const [mode, setMode] = useState<'signin' | 'signup'>(initialEmailMode === 'signup' ? 'signup' : 'signin');

  useEffect(() => {
    setMode(initialEmailMode === 'signup' ? 'signup' : 'signin');
  }, [initialEmailMode, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account authentication"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white shadow-2xl dark:border-[#16436E] dark:bg-[#00223D]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex h-24 items-center justify-center overflow-hidden border-b-2 border-slate-200 bg-[#002541] dark:border-[#144b77]">
          <EcommerceDoodles className="pointer-events-none absolute inset-0 opacity-40" weight="bold" mask={false} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#002541]/40 to-[#002541]/90" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication dialog"
            className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative z-10 flex items-center gap-2 rounded-full border-2 border-[#00875A] bg-white px-3.5 py-1.5 shadow-lg dark:border-[#8df7c1] dark:bg-[#00172A]">
            <AbuLogo size={26} className="shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-black tracking-tight text-slate-900 dark:text-white">ABU</span>
              <span className="mt-0.5 text-[8px] font-extrabold uppercase tracking-wide text-[#00704A] dark:text-[#8df7c1]">
                Marketplace
              </span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden p-4 sm:p-6">
          {/* Telegram-style chat doodle wallpaper behind the auth form */}
          <EcommerceDoodles className="opacity-90" weight="bold" />

          <div className="relative z-10">
            {currentUser ? (
              <div className="text-center">
                <div className="mb-3 flex items-end justify-center gap-3">
                  <img
                    src={currentUser.avatar}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover ring-4 ring-[#00875A]/50"
                  />
                  <span className="rounded-2xl bg-white/95 px-2 py-1.5 shadow-sm ring-1 ring-[#00875A]/25">
                    <HappyShopperCart className="h-12 w-auto" />
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{currentUser.name}</h2>
                {currentUser.email && <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{currentUser.email}</p>}
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:bg-[#07243B] dark:text-[#8df7c1]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Member Session</span>
                </div>
                <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                  <button type="button" onClick={onClose} className="py-2 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 flex justify-center">
                  <span className="rounded-2xl bg-white/95 px-3 py-1.5 shadow-sm ring-1 ring-[#00875A]/25">
                    <HappyShopperCart className="h-16 w-auto" />
                  </span>
                </div>
                <h2 className="mb-3 text-center text-xl font-black text-slate-900 dark:text-white">
                  {mode === 'signup' ? 'Create your ABU account' : 'Sign in to ABU'}
                </h2>

                {/* Sign In / Sign Up switch */}
                <div
                  role="tablist"
                  aria-label="Choose account access"
                  className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm dark:border-white/15 dark:bg-[#07243B]/95"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signin'}
                    aria-controls="abu-auth-panel"
                    onClick={() => setMode('signin')}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      mode === 'signin'
                        ? 'bg-[#00875A] text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signup'}
                    aria-controls="abu-auth-panel"
                    onClick={() => setMode('signup')}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      mode === 'signup'
                        ? 'bg-[#00875A] text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <div id="abu-auth-panel" role="tabpanel" aria-live="polite" className="mx-auto w-full max-w-sm">
                  <ClerkLoading>
                    <AuthFormSkeleton />
                  </ClerkLoading>
                  <ClerkLoaded>
                    <div className="auth-form-enter">
                      {mode === 'signup'
                        ? <SignUp key="signup" routing="hash" appearance={clerkAppearance} />
                        : <SignIn key="signin" routing="hash" appearance={clerkAppearance} />}
                    </div>
                  </ClerkLoaded>
                </div>
                <p className="mt-4 text-center text-[11px] text-slate-600 dark:text-slate-300">
                  By continuing, you agree to our{' '}
                  <button type="button" onClick={onOpenTerms} className="font-bold underline">Terms</button>
                  {' '}and{' '}
                  <button type="button" onClick={onOpenPrivacy} className="font-bold underline">Privacy Policy</button>.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAuthModal;
