import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert, X } from 'lucide-react';

/**
 * Admin-only readiness notice for Clerk session verification.
 *
 * The banner reads the public /api/health payload (a key *mode*, never key material) and
 * compares it with the publishable key this page is actually using. A mismatch, a missing
 * secret or a redacted placeholder makes every signed-in API call fail, which otherwise
 * looks like a broken store form or a 401 on the approval queue. Visibility is limited to
 * admins so shoppers never see deployment details, and the request is skipped entirely
 * for everyone else.
 */

type ClerkMode = 'live' | 'test' | 'missing' | 'invalid';

export type ClerkHealthIssue = {
  tone: 'error' | 'warning';
  title: string;
  detail: string;
  /** Identifies the exact misconfiguration, so dismissing one does not hide a new one. */
  signature: string;
};

const DISMISS_KEY = 'abu:auth-health-dismissed';

/** The publishable key Vite resolved for this build, published in the document head. */
function publishableKey(): string {
  if (typeof document === 'undefined') return '';
  return document.querySelector<HTMLMetaElement>('meta[name="clerk-publishable-key"]')?.content?.trim() || '';
}

/** The key family a publishable key belongs to, or null when it is missing/unknown. */
function keyFamily(key: string): 'live' | 'test' | null {
  if (key.startsWith('pk_live_')) return 'live';
  if (key.startsWith('pk_test_')) return 'test';
  return null;
}

/**
 * Turns the health payload into the one issue an admin needs to act on, or null when the
 * deployment can verify sessions. Pure so the mapping is easy to reason about and test.
 */
export function describeClerkIssue(
  mode: string | undefined,
  pagePublishableKey: string,
  isLocalHost = false,
): ClerkHealthIssue | null {
  if (mode !== 'live' && mode !== 'test' && mode !== 'missing' && mode !== 'invalid') return null;

  const browserFamily = keyFamily(pagePublishableKey);
  const signature = `${mode}:${browserFamily ?? 'unknown'}`;

  if (mode === 'invalid') {
    return {
      tone: 'error',
      title: 'Clerk sign-in verification is misconfigured',
      detail:
        'The API rejected its Clerk secret as a redacted placeholder, so it cannot verify any session. ' +
        'Signed-in actions — including this admin dashboard and the store approval queue — will fail. ' +
        'Set CLERK_SECRET_KEY to the real secret from the Clerk dashboard and redeploy.',
      signature,
    };
  }

  if (mode === 'missing') {
    return {
      tone: 'error',
      title: 'Clerk sign-in verification is not configured',
      detail:
        'No Clerk secret key is set on the server, so every signed-in request is refused. ' +
        'Add CLERK_SECRET_KEY from the Clerk dashboard to the deployment environment and redeploy.',
      signature,
    };
  }

  // Live keys cannot sign in on localhost; that is a Clerk restriction, not a broken
  // deployment, so the banner stays out of the way during local development.
  if (isLocalHost && mode === 'live') return null;

  if (browserFamily && browserFamily !== mode) {
    return {
      tone: 'warning',
      title: `Clerk instance mismatch: page uses ${browserFamily}, server verifies ${mode}`,
      detail:
        `This page signs visitors in with the ${browserFamily} instance, but the API holds a ` +
        `${mode} secret, so it rejects those sessions. Point CLERK_SECRET_KEY at the same Clerk ` +
        'instance as VITE_CLERK_PUBLISHABLE_KEY.',
      signature,
    };
  }

  return null;
}

export interface AuthHealthBannerProps {
  /** Fetching is skipped for non-admins, so ordinary visitors cost nothing. */
  isAdmin: boolean;
}

export const AuthHealthBanner: React.FC<AuthHealthBannerProps> = ({ isAdmin }) => {
  const [issue, setIssue] = useState<ClerkHealthIssue | null>(null);
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
        setIssue(null);
        return;
      }
      const data = (await res.json()) as { auth?: { clerkKeyMode?: string } };
      setIssue(
        describeClerkIssue(
          data?.auth?.clerkKeyMode,
          publishableKey(),
          typeof window !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname),
        ),
      );
    } catch {
      setIssue(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setIssue(null);
      return;
    }
    void load();
  }, [isAdmin, load]);

  if (!isAdmin || !issue || dismissed === issue.signature) return null;

  const dismiss = () => {
    setDismissed(issue.signature);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, issue.signature);
    } catch {
      // Private browsing can refuse storage; the banner simply returns on reload.
    }
  };

  const isError = issue.tone === 'error';
  const Icon = isError ? ShieldAlert : AlertTriangle;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`border-b px-4 py-2.5 ${
        isError
          ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-[#2A1218] dark:text-rose-100'
          : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-[#2A2112] dark:text-amber-100'
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold leading-snug">{issue.title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{issue.detail}</p>
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
