import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldAlert, X } from 'lucide-react';

/**
 * Admin-only readiness notice for Clerk session verification.
 *
 * /api/health makes a real Clerk call with the server secret. The banner appears only
 * when that call fails, and shows the short error it returned. It never sees key material.
 */

type Health = { clerkVerified?: boolean; clerkError?: string | null };

const DISMISS_KEY = 'abu:auth-health-dismissed';

export const AuthHealthBanner: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [clerkError, setClerkError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  const load = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/health', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        // A health endpoint that is down tells us nothing about the keys; stay quiet.
        setClerkError(null);
        return;
      }
      const data = (await res.json()) as Health;
      setClerkError(
        data.clerkVerified === false
          ? data.clerkError || 'Clerk rejected the secret key.'
          : null,
      );
    } catch {
      setClerkError(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setClerkError(null);
      return;
    }
    void load();
  }, [isAdmin, load]);

  if (!isAdmin || !clerkError || dismissed === clerkError) return null;

  const dismiss = () => {
    setDismissed(clerkError);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, clerkError);
    } catch {
      // Private browsing can refuse storage; the banner simply returns on reload.
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-b border-rose-300 bg-rose-50 px-4 py-2.5 text-rose-950 dark:border-rose-900 dark:bg-[#2A1218] dark:text-rose-100"
    >
      <div className="mx-auto flex w-full max-w-7xl items-start gap-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold leading-snug">
            Clerk sign-in verification is failing
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
            The API could not verify its Clerk secret: {clerkError}. Signed-in actions will
            fail until CLERK_SECRET_KEY is fixed and the app is redeployed.
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
            Admin-only notice · readiness from /api/health
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void load()}
            disabled={isChecking}
            className="inline-flex h-7 items-center gap-1 rounded border border-black/20 px-2 text-[11px] font-bold hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/25 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isChecking ? 'Checking…' : 'Recheck'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss Clerk verification notice"
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-transparent hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
